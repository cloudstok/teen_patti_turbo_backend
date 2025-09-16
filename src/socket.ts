import { Socket, Server } from "socket.io";
import { fetchUserDetails } from "./utils/fetchUserDetails";
import { deleteCache, getCache, setCache } from "./utils/redisConnection";    
import { messageRoute } from "./routes/messsageRouter";

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
        const isUserExist = await getCache(userData.id);
        if (isUserExist) {
            console.log("User already connected from a platform, disconnecting older resource....");
            const socket = io.sockets.sockets.get(isUserExist);
            if (socket) {
                socket.emit('betError', 'User connected from another source');
                socket.disconnect(true);
            }
        }

        socket.emit('info', {
            user_id: userData?.user_id,
            operator_id: userData?.operatorId,
            balance: userData?.balance
        });

        await setCache(`PL:${socket.id}`, JSON.stringify(userData));
        await setCache(userData.id,socket.id)

        messageRoute(socket);

        socket.on('disconnect', async () => {
            await deleteCache(`PL:${socket.id}`);
            await deleteCache(userData.id);
        })

        socket.on('error', (err: Error) => {
            console.log(`Connection error for socket : ${socket.id}`, err.message);
        })
    });

}
