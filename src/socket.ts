import { Socket, Server } from "socket.io";
import { fetchUserDetails } from "./utils/fetchUserDetails";
import { deleteCache, setCache } from "./utils/redisConnection";
import { messageRoute } from "./routes/messsageRouter";
export const inPlayUser: Map<string, string> = new Map();

export function socket(io: Server) {
    io.on('connection', async (socket: Socket) => {
        const token = socket.handshake.query.token as string;
        const game_id = socket.handshake.query.game_id as string;

        if (!token || !game_id) {
            socket.disconnect(true);
            console.log("Missing parameters :", { token, game_id });
            return
        }

        const userData = await fetchUserDetails(token, game_id);

        if (!userData) {
            socket.disconnect(true);
            console.log('Invalid User')
            return
        }

        const isUserConnected = inPlayUser.get(userData.id);
        if (isUserConnected) {
        socket.emit('bet_error', 'User already connected, disconnecting...');
        socket.disconnect(true);
        return;
        }


        socket.emit('info', {
            user_id: userData?.user_id,
            operator_id: userData?.operatorId,
            balance: userData?.balance
        });

        await setCache(`PL:${socket.id}`, JSON.stringify(userData));
        inPlayUser.set(userData.id, socket.id);

        messageRoute(socket);

        socket.on('disconnect', async () => {
            await deleteCache(`PL:${socket.id}`);
               for (const [userId, sId] of inPlayUser.entries()) {
                if (sId === socket.id) {
                    inPlayUser.delete(userId);
                    break;
                }
            }
        })

        socket.on('error', (err: Error) => {
            console.log(`Connection error for socket : ${socket.id}`, err.message);
        })
    });

}
