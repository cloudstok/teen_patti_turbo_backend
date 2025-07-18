import { Settlement } from "../../interface/interface"
import { write, read } from "../../utils/dbConnection";

const SQL_INSERT_QUERY = 'INSERT INTO settlement (user_id, round_id, operator_id, bet_amount, winning_amount, multiplier, status, result) VALUES (?,?,?,?,?,?,?,?)'
export const insertData = async(data:Settlement) =>{
    try {
        const {user_id, round_id, operator_id,bet_amount, winning_amount, multiplier, status, result} = data;
    await write(SQL_INSERT_QUERY,[
        user_id,
        round_id,
        operator_id,
        Number(bet_amount).toFixed(2),
        Number(winning_amount).toFixed(2),
        Number(multiplier).toFixed(2), 
        status,
        result
    ]);
    console.log('Inserted settlement values successfully');
    }catch(err:any) {
        console.log('Error inserting the data :',err.message);
    }
};

export const readData = async (user_id: string, operator_id: string, limit: number): Promise<any[] | undefined> => {
    try {
        const SQL_READ_QUERY = `select * from settlement where user_id = ? AND operator_id = ? order by created_at DESC LIMIT ${limit}`
        const data = await read(SQL_READ_QUERY, [user_id, operator_id]);
        if (!data) {
            console.log(`Error from read data :Data not found for user_id : ${user_id} and operator_id : ${operator_id}`);
            return 
        } else {
            const parsedData = data.map((row: any) => {
            try {
                row.result = JSON.parse(row.result);
            } catch (err:any) {
                console.warn(`Failed to parse result for row ID ${row.id}.  Message: ${err.message}`,);
                row.result = []; 
            }
            return row;
        });
            console.log(`Data read successfully Player_id : ${user_id} and ${operator_id}`);
            return parsedData
        };

    } catch (err: any) {
        console.log('Error from read data :', err.message);
    }

};