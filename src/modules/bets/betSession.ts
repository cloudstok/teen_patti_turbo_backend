import { reqData, Settlement } from "../../interface/interface";
import { deleteCache, getCache, setCache } from "../../utils/redisConnection";
import { Socket } from "socket.io";
import { generateUUIDv7, updateBalanceFromAccount } from "../../utils/commonFunctions";
import { calculateWinnings, getUserIP } from "../../utils/helperFunctions";
import { appConfig } from "../../utils/appConfig";
import { insertData } from "./betDb";
import { createLogger } from "../../utils/loggers";

const logger = createLogger('Bets', 'jsonl');

const validateBets = (btAmt: number, balance: number, socket: Socket): Boolean => {
    if (isNaN(Number(btAmt))) {
        socket.emit("bet_error", "message : Invalid Bet amount type");
        return false;
    };
    if (btAmt > balance) {
        socket.emit("bet_error", "message : Insufficient Balance");
        return false;
    };
    if (btAmt < appConfig.minBetAmount || btAmt > appConfig.maxBetAmount) {
        socket.emit("bet_error", "message : Invalid bet amount.");
        return false;
    };
    return true;
};

export const placeBet = async (socket: Socket, data: reqData) => {
    const lockKey = `BET_LOCK:${socket.id}`;
    try {
        const isLocked = await getCache(lockKey);
        if (isLocked) {
            return socket.emit('bet_error', 'Multiple bets not allowed at the same time');
        }

        await setCache(lockKey, '1');

        const playerDetails = await getCache(`PL:${socket.id}`);
        if (!playerDetails) {
            await deleteCache(lockKey);
            return socket.emit('bet_error', 'Invalid User');
        };

        const parsedPlayerDetails = JSON.parse(playerDetails);
        const { user_id, operatorId, token, game_id, balance } = parsedPlayerDetails;


        if (!validateBets(data.btAmt, balance, socket)) {
            await deleteCache(lockKey);
            return;
        }

        const roundId = generateUUIDv7();
        const userIP = getUserIP(socket);
        const webhookData = await updateBalanceFromAccount({
            id: roundId,
            bet_amount: data.btAmt,
            game_id,
            ip: userIP,
            user_id: user_id
        }, "DEBIT", { game_id, operatorId, token });

        if (!webhookData.status) return socket.emit("bet_error", "message : Bet Cancelled By Upstream Server ");
        parsedPlayerDetails.balance -= data.btAmt;
        logger.info(`Bets Placed Successfully for player : ${JSON.stringify(parsedPlayerDetails)} with bet amount : ${data.btAmt}`)
        await setCache(`PL:${socket.id}`, JSON.stringify(parsedPlayerDetails));

        socket.emit('info', {
            user_id: user_id,
            operator_id: operatorId,
            balance: parsedPlayerDetails.balance
        });

        //Bet Result
        const txn_id = webhookData.txn_id;
        const { betAmt, winAmt, mult, status, handType, result } = calculateWinnings(data);

        if (status == "win") {
            setTimeout(async () => {
                updateBalanceFromAccount({
                    id: roundId,
                    txn_id: txn_id,
                    bet_amount: betAmt,
                    winning_amount: winAmt,
                    game_id: game_id,
                    user_id: user_id
                }, "CREDIT", ({ game_id, operatorId, token }))

                logger.info(`Winning Credited | User: ${user_id} | Amount: ${winAmt}`);

                parsedPlayerDetails.balance += winAmt

                await setCache(`PL:${socket.id}`, JSON.stringify(parsedPlayerDetails));
            }, 1000)

            setTimeout(() => {
                socket.emit('info', {
                    user_id,
                    operator_id: operatorId,
                    balance: parsedPlayerDetails.balance
                });
            }, 8000);

        } else {
            logger.info(`Bet Lost | User: ${user_id} | Amount: ${betAmt}`);
        }

        socket.emit("result", {
            status,
            winAmt,
            mult,
            handType,
            cards: result
        });

        // Insert Data
        const dbObj: Settlement = {
            user_id,
            round_id: roundId,
            operator_id: operatorId,
            bet_amount: Number(data.btAmt),
            winning_amount: Number(winAmt),
            multiplier: Number(mult),
            status,
            hand_type: handType,
            result: JSON.stringify(result)
        };
        logger.info(dbObj);
        await insertData(dbObj);
    } catch (err: any) {
        logger.error(`Error occured in pb: ${err.message}`);
    } finally {
        await deleteCache(lockKey);
        return;
    }
};