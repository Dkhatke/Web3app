// app.mock.js — lightweight demo script to make the UI interactive without blockchain
// Safe for local development. This won't perform any real transactions.

const connectWalletBtn = document.getElementById('connectWalletBtn');
const createCampaignBtn = document.getElementById('createCampaignBtn');
const campaignsGrid = document.getElementById('campaignsGrid');
const tiersList = document.getElementById('tiersList');
const selectedName = document.getElementById('selectedName');
const selectedOwner = document.getElementById('selectedOwner');
const selectedStatus = document.getElementById('selectedStatus');
const selectedBalance = document.getElementById('selectedBalance');
const withdrawBtn = document.getElementById('withdrawBtn');
const refundBtn = document.getElementById('refundBtn');

let userAddress = null;
let campaigns = [];
let selectedIndex = null;
let userBacked = {}; // map campaignIndex -> true if user funded

// Sample mock data
function seedMockData(){
  campaigns = [
    {
      name: 'Education for All',
      owner: '0x87B2cD34fA9e1234567890aBcDEF1234567890ab',
      description: 'Provide educational resources to underserved communities.',
      goal: 100,
      balance: 64,
      address: '0xAAA111...',
      tiers: [
        { name: 'Bronze', amount: 0.1, backers: 3 },
        { name: 'Silver', amount: 0.5, backers: 8 },
        { name: 'Gold', amount: 1, backers: 2 },
      ],
    },
    {
      name: 'Green Energy Project',
      owner: '0xC39aD1bc1234567890AaBbCcDDEeFf00112233',
      description: 'Support development of clean energy solutions.',
      goal: 20,
      balance: 20,
      address: '0xBBB222...',
      tiers: [
        { name: 'Supporter', amount: 0.2, backers: 10 },
        { name: 'Sponsor', amount: 2, backers: 1 },
      ],
    },
    {
      name: 'Local Artists Fund',
      owner: '0x12F3a4567890abcdef1234567890ABCDEF1234',
      description: 'Help local artists continue creating.',
      goal: 50,
      balance: 12,
      address: '0xCCC333...',
      tiers: [
        { name: 'Patron', amount: 0.05, backers: 12 },
        { name: 'Collector', amount: 0.8, backers: 4 },
      ],
    }
  ];
}

function short(addr){
  if(!addr) return '—';
  return addr.slice(0,6) + '...' + addr.slice(-4);
}

function renderCampaigns(){
  campaignsGrid.innerHTML = '';
  campaigns.forEach((c, i) => {
    const progress = Math.min(Math.round((c.balance / c.goal) * 100), 100);
    const art = document.createElement('article');
    art.className = 'bg-white rounded-xl shadow-sm hover:shadow-lg transition p-4 flex flex-col';
    art.innerHTML = `
      <div class="flex items-start justify-between gap-2">
        <div>
          <h3 class="font-semibold text-gray-800">${c.name}</h3>
          <p class="text-xs text-gray-500 mt-1">Owner: <span class="font-mono text-xs text-gray-600">${short(c.owner)}</span></p>
        </div>
        <button class="selectBtn text-sm text-blue-600" data-index="${i}">Select</button>
      </div>
      <p class="text-sm text-gray-600 mt-3">${c.description}</p>
      <div class="mt-4 flex items-center justify-between">
        <div class="text-sm text-gray-500">Goal: <span class="font-medium text-gray-800">${c.goal} ETH</span></div>
        <div class="text-sm text-gray-500">Raised: <span class="font-medium text-gray-800">${c.balance} ETH</span></div>
      </div>
      <div class="mt-3">
        <div class="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
          <div class="bg-blue-600 h-2" style="width:${progress}%"></div>
        </div>
      </div>
    `;

    art.querySelector('.selectBtn').addEventListener('click', ()=> selectCampaign(i));
    campaignsGrid.appendChild(art);
  });
}

function selectCampaign(i){
  selectedIndex = i;
  const c = campaigns[i];
  selectedName.innerText = c.name;
  selectedOwner.innerText = 'Owner: ' + short(c.owner);
  selectedBalance.innerText = c.balance + ' ETH';
  // status: simple logic
  const status = c.balance >= c.goal ? 'Successful' : 'Active';
  selectedStatus.innerText = status;

  // tiers
  tiersList.innerHTML = '';
  c.tiers.forEach((t, idx)=>{
    const div = document.createElement('div');
    div.className = 'tier-card bg-gray-50 border border-gray-100 rounded-lg p-3 flex items-center justify-between';
    const funded = userBacked[i];
    div.innerHTML = `
      <div>
        <div class="text-sm font-medium">${t.name}</div>
        <div class="text-xs text-gray-500">Amount: ${t.amount} ETH • Backers: ${t.backers}</div>
      </div>
      <div class="flex items-center gap-2">
        <button class="fundBtn px-3 py-1 rounded-md text-sm text-white ${funded ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}" ${funded ? 'disabled' : ''} data-tier="${idx}">${funded ? 'Funded' : 'Fund'}</button>
      </div>
    `;
    div.querySelector('.fundBtn').addEventListener('click', ()=> fundTier(idx));
    tiersList.appendChild(div);
  });

  // actions
  withdrawBtn.disabled = !(userAddress && userAddress.toLowerCase() === c.owner.toLowerCase());
  refundBtn.disabled = !(userAddress && userBacked[i]);
}

function fundTier(tierIdx){
  if(selectedIndex === null) return alert('Select a campaign first');
  if(!userAddress) return alert('Connect wallet first');
  const c = campaigns[selectedIndex];
  const tier = c.tiers[tierIdx];
  // simulate funding
  c.balance = +(c.balance + tier.amount).toFixed(4);
  tier.backers += 1;
  userBacked[selectedIndex] = true;
  renderCampaigns();
  selectCampaign(selectedIndex);
}

connectWalletBtn.addEventListener('click', ()=>{
  if(!userAddress){
    // fake connect
    userAddress = '0x' + Math.random().toString(16).slice(2, 10) + 'ABCDEF';
    connectWalletBtn.innerText = short(userAddress);
  } else {
    // disconnect
    userAddress = null;
    connectWalletBtn.innerText = 'Connect Wallet';
    withdrawBtn.disabled = true;
    refundBtn.disabled = true;
  }
});

createCampaignBtn.addEventListener('click', ()=>{
  if(!userAddress) return alert('Connect wallet to create campaigns');
  const name = prompt('Campaign name:');
  if(!name) return;
  const goal = parseFloat(prompt('Goal (ETH):', '10')) || 10;
  const newC = { name, owner: userAddress, description: 'User created campaign', goal, balance: 0, address: '0xNEW'+Math.random().toString(16).slice(2,6), tiers: [{name:'Supporter', amount:0.1, backers:0}] };
  campaigns.unshift(newC);
  renderCampaigns();
});

withdrawBtn.addEventListener('click', ()=>{
  if(selectedIndex===null) return alert('Select a campaign');
  const c = campaigns[selectedIndex];
  if(userAddress.toLowerCase() !== c.owner.toLowerCase()) return alert('Only owner can withdraw in demo');
  // simulate withdraw (reset balance)
  c.balance = 0;
  alert('Withdraw simulated — balance set to 0');
  renderCampaigns();
  selectCampaign(selectedIndex);
});

refundBtn.addEventListener('click', ()=>{
  if(selectedIndex===null) return alert('Select a campaign');
  const campaign = campaigns[selectedIndex];
  if(!userBacked[selectedIndex]) return alert('You have not funded this campaign');
  // Find user's tier contribution and subtract it from balance
  const userTier = campaign.tiers.find(t => t.backers > 0);
  if(userTier) {
    campaign.balance = Math.max(0, +(campaign.balance - userTier.amount).toFixed(4));
    userTier.backers -= 1;
  }
  // Reset user's backing state
  userBacked[selectedIndex] = false;
  alert('Refund processed — contribution returned and balance updated');
  renderCampaigns();
  selectCampaign(selectedIndex);
});

window.addEventListener('DOMContentLoaded', ()=>{
  seedMockData();
  renderCampaigns();
});
