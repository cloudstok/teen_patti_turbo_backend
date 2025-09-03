// @ts-nocheck
function simulateTeenPatti(rounds, bet) {
    const suits = ['H', 'S', 'C', 'D'];

    let totalBet = 0;
    let totalWin = 0;
    let totalPairWin = 0;
    let totalFlushWin = 0;
    let totalStraightWin = 0;
    let totalThreeOfKindWin = 0;
    let totalStraightFlushWin = 0;
    let pairCount = 0;
    let flushCount = 0;
    let straightCount = 0;
    let threeOfKindCount = 0;
    let straightFlushCount = 0;

    const deck = [];

    for (let suit of suits) {
        for (let num = 1; num <= 13; num++) {
            deck.push({ suit, num });
        }
    }

    for (let j = deck.length - 1; j > 0; j--) {
        const k = Math.floor(Math.random() * (j + 1));
        [deck[j], deck[k]] = [deck[k], deck[j]];
    }

    for (let i = 0; i < rounds; i++) {
        totalBet += bet;
        const hand = [];
        const randomCards = [];
        while (hand.length < 3) {
            const card = deck[Math.floor(Math.random() * 52)]
            const concat = `${card.num}+${card.suit}`;
            if (!randomCards.includes(concat)) {
                randomCards.push(concat);
                hand.push(card);
            }
        }

        const nums = hand.map(card => card.num).sort((a, b) => a - b);
        const suitsDrawn = hand.map(card => card.suit);
        const [num1, num2, num3] = nums;
        const flush = suitsDrawn[0] === suitsDrawn[1] && suitsDrawn[1] === suitsDrawn[2];
        const straight = num2 === num1 + 1 && num3 === num2 + 1;
        const threeOfKind = num1 === num2 && num2 === num3;
        const pair = num1 === num2 || num2 === num3 || num1 === num3;
        const straightFlush = flush && straight;

        if (threeOfKind) {
            totalThreeOfKindWin += bet * 30;
            totalWin += bet * 30;
            threeOfKindCount++;
        } else if (straightFlush) {
            totalStraightFlushWin += bet * 50;
            totalWin += bet * 50;
            straightFlushCount++;
        } else if (straight) {
            totalStraightWin += bet * 6;
            totalWin += bet * 6;
            straightCount++;
        } else if (flush) {
            totalFlushWin += bet * 5;
            totalWin += bet * 5;
            flushCount++;
        } else if (pair) {
            totalPairWin += bet * 2;
            totalWin += bet * 2;
            pairCount++;
        }
    }

    const rtp = (totalWin / totalBet) * 100;
    const houseEdge = 100 - rtp;
    const probPair = pairCount / rounds;
    const probFlush = flushCount / rounds;
    const probStraight = straightCount / rounds;
    const probThreeOfKind = threeOfKindCount / rounds;
    const probStraightFlush = straightFlushCount / rounds;
    const probNull = 1 - (probPair + probFlush + probStraight + probThreeOfKind + probStraightFlush);

    // console.log("Total Rounds:", rounds); 
    // console.log("Total Bet:", totalBet); 
    // console.log("Total Win:", totalWin); 
    // console.log('For Pair:'); 
    // console.log('Count:', pairCount); 
    // console.log('Total Win:', totalPairWin); 
    // console.log('Probability:', probPair.toFixed(4)); 
    // console.log('For Flush:'); 
    // console.log('Count:', flushCount); 
    // console.log('Total Win:', totalFlushWin); 
    // console.log('Probability:', probFlush.toFixed(4)); 
    // console.log('For Straight:'); 
    // console.log('Count:', straightCount); 
    // console.log('Total Win:', totalStraightWin); 
    // console.log('Probability:', probStraight.toFixed(4)); 
    // console.log('For Three of a Kind:'); 
    // console.log('Count:', threeOfKindCount); 
    // console.log('Total Win:', totalThreeOfKindWin); 
    // console.log('Probability:', probThreeOfKind.toFixed(4)); 
    // console.log('For Straight Flush:'); 
    // console.log('Count:', straightFlushCount); 
    // console.log('Total Win:', totalStraightFlushWin); 
    // console.log('Probability:', probStraightFlush.toFixed(4)); 
    // console.log('Null Hand Probability:', probNull.toFixed(4)); 
    console.log("RTP:", rtp.toFixed(2) + "%");
    console.log("House Edge:", houseEdge.toFixed(2) + "%");

}

simulateTeenPatti(1000000, 100) 