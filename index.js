const { ethers } = require('ethers');
const { Firestore } = require('@google-cloud/firestore');

const erc20Abi = [
  {
    "constant": true,
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [{"name": "owner", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
];

const providerUrl = 'https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161';
const provider = new ethers.providers.JsonRpcProvider(providerUrl);
const firestore = new Firestore();

const nonCirculatingAddresses = [
    '0x0000000000000000000000000000000000000000',
    '0x000000000000000000000000000000000000dead',
    '0xad0A852F968e19cbCB350AB9426276685651ce41',
    '0x4D9B76Df13DF257A674AEc7Ec7232741A6E73883',
    '0xD5e6219A79C5CC61b9074331D1B05a6f35c5a48a',
    '0x8481221376eaFaCa587349ABbd2670e696c195ad',
    '0xE951CbA2745F38cC5c4D369EEd3A060a7A39d70C',
    '0xE86Bf3B0D3a20444DE7c78932ACe6e5EfFE92379'
];

exports.getTotalSupply = async (req, res) => {
  try {
    const contractAddress = "0x967da4048cD07aB37855c090aAF366e4ce1b9F48";
     const cacheRef = firestore.collection('totalsupply_cache').doc(contractAddress);
    const cacheSnap = await cacheRef.get();

    if (cacheSnap.exists) {
      const cacheData = cacheSnap.data();

      // 1 day in milliseconds
      const ONE_DAY_MS = 24 * 60 * 60 * 1000;
      if ((Date.now() - cacheData.timestamp) <= ONE_DAY_MS) {
        res.status(200).send(cacheData.adjustedTotalSupply.toString());
        return;
      }
    }

    const contract = new ethers.Contract(contractAddress, erc20Abi, provider);
    const totalSupply = await contract.totalSupply();
    let nonCirculatingTotal = ethers.BigNumber.from('0');

    for (const nonCirculating of nonCirculatingAddresses) {
      const amount = await contract.balanceOf(nonCirculating);
      nonCirculatingTotal = nonCirculatingTotal.add(amount);
    }

    const adjustedTotalSupply = totalSupply.sub(nonCirculatingTotal);
    const adjustedTotalSupplyEth = ethers.utils.formatEther(adjustedTotalSupply);

     await cacheRef.set({
      adjustedTotalSupply: adjustedTotalSupplyEth.toString(),
      timestamp: Date.now()
    });

    res.status(200).send(adjustedTotalSupplyEth.toString());
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
};
