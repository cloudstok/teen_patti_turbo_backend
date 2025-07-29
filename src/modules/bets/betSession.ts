import { reqData, Settlement } from "../../interface/interface";
import { getCache, setCache } from "../../utils/redisConnection";
import { Socket } from "socket.io";
import { generateUUIDv7, updateBalanceFromAccount } from "../../utils/commonFunctions";
import { calculateWinnings, getUserIP } from "../../utils/helperFunctions";
import { appConfig } from "../../utils/appConfig";
import { insertData } from "./betDb";
import { createLogger } from "../../utils/loggers";

const logger = createLogger('Bets', 'jsonl');

export const placeBet = async (socket: Socket, data: reqData) => {
    try {
        const playerDetails = await getCache(`PL:${socket.id}`);
        if (!playerDetails) {
            return socket.emit('bet_error', 'Invalid User');
        };

        const parsedPlayerDetails = JSON.parse(playerDetails);
        const { user_id, operatorId, token, game_id, balance } = parsedPlayerDetails;

        if (isNaN(Number(data.btAmt))) return socket.emit("bet_error", "message : Invalid Bet amount type");
        if (data.btAmt > Number(balance)) return socket.emit("bet_error", "message : Insufficient Balance");
        if (data.btAmt < appConfig.minBetAmount || data.btAmt > appConfig.maxBetAmount) {
            return socket.emit("bet_error", "message : Invalid bet amount.")
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
        const txn_id = webhookData.txn_id
        const { betAmt, winAmt, mult, status, handType, result } = calculateWinnings(data);
        if (status == "win") {
            await updateBalanceFromAccount({
                id: roundId,
                txn_id: txn_id,
                bet_amount: betAmt,
                winning_amount: winAmt,
                game_id: game_id,
                user_id: user_id
            }, "CREDIT", ({ game_id, operatorId, token }))

            logger.info(`Winning Credited | User: ${user_id} | Amount: ${winAmt}`);

            parsedPlayerDetails.balance += winAmt;
            await setCache(`PL: ${socket.id}`, JSON.stringify(parsedPlayerDetails));
            setTimeout(() => {
                socket.emit('info', {
                    user_id,
                    operator_id: operatorId,
                    balance: parsedPlayerDetails.balance
                });
            }, 5000);

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

        await insertData(dbObj);
        return
    } catch (err: any) {
        logger.error(`Error occured in pb: ${err.message}`);
    }
};