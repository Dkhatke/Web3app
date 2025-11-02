import { ThirdwebSDK } from "./sdk-module.js";

// 🚨 CHANGE THIS to your deployed factory contract
const factoryAddress = "0xD94C35b46e1884Ac5003367a8f299EB8F0a0cd1b";

let sdk, factory, campaigns = [], selectedCampaign = null, campaignContract = null, userAddress = null;

// DOM elements
const connectWalletBtn = document.getElementById("connectWalletBtn");
const createCampaignBtn = document.getElementById("createCampaignBtn");
const campaignsGrid = document.getElementById("campaignsGrid");
const tiersList = document.getElementById("tiersList");
const selectedName = document.getElementById("selectedName");
const selectedOwner = document.getElementById("selectedOwner");
const selectedBalance = document.getElementById("selectedBalance");
const selectedStatus = document.getElementById("selectedStatus");
const withdrawBtn = document.getElementById("withdrawBtn");
const refundBtn = document.getElementById("refundBtn");

// Helper: format ETH
const formatEth = (wei) => wei ? (Number(wei) / 1e18).toFixed(2) : "0.00";
const formatEthFull = (wei) => wei ? (Number(wei) / 1e18).toFixed(4) : "0.0000";

// ===== Wallet connection =====
async function connectWallet() {
    if (!window.ethereum) return alert("MetaMask not found!");

    try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        userAddress = accounts[0];

        sdk = new ThirdwebSDK(window.ethereum);
        factory = await sdk.getContract(factoryAddress);

        connectWalletBtn.innerText = userAddress.slice(0, 6) + "..." + userAddress.slice(-4);

        await loadCampaigns();
        if (selectedCampaign) await loadSelectedCampaign();

    } catch (err) {
        console.error("Wallet connection failed:", err);
        alert("Wallet connection failed: " + (err.message || "See console for details."));
    }
}

connectWalletBtn.onclick = connectWallet;

// ===== Listen for account/network changes =====
if (window.ethereum) {
    window.ethereum.on("accountsChanged", (accounts) => {
        if (accounts.length === 0) {
            userAddress = null;
            connectWalletBtn.innerText = "Connect Wallet";
            alert("Wallet disconnected");
            withdrawBtn.disabled = true;
            refundBtn.disabled = true;
        } else {
            userAddress = accounts[0];
            connectWalletBtn.innerText = userAddress.slice(0, 6) + "..." + userAddress.slice(-4);
            loadCampaigns();
            if (selectedCampaign) loadSelectedCampaign();
        }
    });

    window.ethereum.on("chainChanged", () => {
        window.location.reload();
    });
}

// ===== Create Campaign =====
createCampaignBtn.onclick = async () => {
    if (!userAddress) return alert("Connect wallet first!");
    
    const name = prompt("Enter campaign name:");
    const description = prompt("Enter description:");
    const goalEth = prompt("Enter goal (ETH):");
    const durationDays = prompt("Enter duration (days):");

    if (!name || !goalEth || !durationDays) return alert("All fields are required!");

    try {
        const goalWei = (Number(goalEth) * 1e18).toString();
        const tx = await factory.call("createCampaign", [name, description, goalWei, durationDays]);
        await tx.wait();
        alert("Campaign created successfully!");
        await loadCampaigns();
    } catch (err) {
        console.error("Error creating campaign:", err);
        alert("Error creating campaign: " + (err.reason || err.message));
    }
};

// ===== Load Campaigns =====
async function loadCampaigns() {
    if (!factory) return;

    try {
        campaigns = await factory.call("getAllCampaigns");
        campaignsGrid.innerHTML = "";

        if (!campaigns.length) {
            campaignsGrid.innerHTML = "<p class='text-gray-500'>No campaigns yet. Create one!</p>";
            return;
        }

        for (let i = 0; i < campaigns.length; i++) {
            const c = campaigns[i];
            const contract = await sdk.getContract(c.campaignAddress);
            const balance = await contract.call("getContractBalance");
            const status = await contract.call("getCampaignStatus");

            const progress = c.goal > 0 ? Math.min((balance / c.goal) * 100, 100) : 0;

            const div = document.createElement("article");
            div.className = "bg-white rounded-xl shadow-sm hover:shadow-lg transition p-4 flex flex-col";

            div.innerHTML = `
                <div class="flex items-start justify-between gap-2">
                    <div>
                        <h3 class="font-semibold text-gray-800">${c.name}</h3>
                        <p class="text-xs text-gray-500 mt-1">Owner: <span class="font-mono text-xs text-gray-600">${c.owner.slice(0, 6)}...${c.owner.slice(-4)}</span></p>
                    </div>
                    <button class="selectBtn text-sm text-blue-600">Select</button>
                </div>
                <p class="text-sm text-gray-600 mt-3">${c.description || "No description"}</p>
                <div class="mt-4 flex items-center justify-between">
                    <div class="text-sm text-gray-500">Goal: <span class="font-medium text-gray-800">${formatEth(c.goal)} ETH</span></div>
                    <div class="text-sm text-gray-500">Raised: <span class="font-medium text-gray-800">${formatEth(balance)} ETH</span></div>
                </div>
                <div class="mt-3">
                    <div class="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div class="bg-blue-600 h-2" style="width:${progress}%"></div>
                    </div>
                </div>
                <div class="mt-2 text-sm font-semibold ${status === "Successful" ? "text-green-600" : status === "Failed" ? "text-red-600" : "text-gray-500"}">${status}</div>
            `;

            div.querySelector(".selectBtn").onclick = () => selectCampaign(i);
            campaignsGrid.appendChild(div);
        }
    } catch (err) {
        console.error("Error loading campaigns:", err);
        campaignsGrid.innerHTML = "<p class='text-red-500'>Failed to load campaigns.</p>";
    }
}

// ===== Select Campaign =====
async function selectCampaign(index) {
    if (!sdk) return alert("Connect wallet first!");
    selectedCampaign = campaigns[index];
    campaignContract = await sdk.getContract(selectedCampaign.campaignAddress);

    await loadSelectedCampaign();
}
window.selectCampaign = selectCampaign;

// ===== Load Selected Campaign =====
async function loadSelectedCampaign() {
    if (!campaignContract) return;

    try {
        const tiers = await campaignContract.call("getTiers");
        const status = await campaignContract.call("getCampaignStatus");
        const balance = await campaignContract.call("getContractBalance");

        selectedName.innerText = selectedCampaign.name;
        selectedOwner.innerText = "Owner: " + selectedCampaign.owner.slice(0, 6) + "..." + selectedCampaign.owner.slice(-4);
        selectedBalance.innerText = formatEthFull(balance) + " ETH";
        selectedStatus.innerText = status;

        // Enable/disable buttons dynamically
        const isOwner = userAddress?.toLowerCase() === selectedCampaign.owner.toLowerCase();
        withdrawBtn.disabled = !(isOwner && status === "Successful");
        refundBtn.disabled = !(status === "Failed");

        tiersList.innerHTML = "";
        tiers.forEach((t, i) => {
            const isDisabled = status !== "Active" || balance >= selectedCampaign.goal;

            const div = document.createElement("div");
            div.className = "tier-card bg-gray-50 border border-gray-100 rounded-lg p-3 flex items-center justify-between";

            div.innerHTML = `
                <div>
                    <div class="text-sm font-medium">${t.name}</div>
                    <div class="text-xs text-gray-500">Amount: ${formatEthFull(t.amount)} ETH • Backers: ${t.backers}</div>
                </div>
                <button ${isDisabled ? "disabled" : ""} class="fundBtn px-3 py-1 rounded-md text-sm text-white bg-blue-600 hover:bg-blue-700 ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}">Fund</button>
            `;

            div.querySelector(".fundBtn").onclick = () => fundTier(i);
            tiersList.appendChild(div);
        });
    } catch (err) {
        console.error("Error loading campaign details:", err);
        alert("Error loading campaign details: " + (err.message || "Contract call failed."));
    }
}

// ===== Fund Tier =====
async function fundTier(tierIndex) {
    if (!campaignContract || !userAddress) return alert("Select a campaign and connect wallet first!");
    try {
        const tiers = await campaignContract.call("getTiers");
        if (!tiers[tierIndex]) return alert("Invalid tier");
        const tx = await campaignContract.call("fund", [tierIndex], { value: tiers[tierIndex].amount.toString() });
        await tx.wait();
        alert("Funded successfully!");
        await loadSelectedCampaign();
        await loadCampaigns();
    } catch (err) {
        console.error(err);
        alert("Funding failed: " + (err.reason || err.message));
    }
}
window.fundTier = fundTier;

// ===== Withdraw =====
withdrawBtn.onclick = async () => {
    if (!campaignContract || !userAddress) return alert("Select a campaign and connect wallet first!");
    const owner = await campaignContract.call("owner");
    if (owner.toLowerCase() !== userAddress.toLowerCase()) return alert("Only owner can withdraw");

    try {
        const tx = await campaignContract.call("withdraw");
        await tx.wait();
        alert("Withdraw successful!");
        await loadSelectedCampaign();
        await loadCampaigns();
    } catch (err) {
        console.error(err);
        alert("Withdraw failed: " + (err.reason || err.message));
    }
};

// ===== Refund =====
refundBtn.onclick = async () => {
    if (!campaignContract || !userAddress) return alert("Select a campaign and connect wallet first!");
    try {
        const tx = await campaignContract.call("refund");
        await tx.wait();
        alert("Refund successful!");
        await loadSelectedCampaign();
        await loadCampaigns();
    } catch (err) {
        console.error(err);
        alert("Refund failed: " + (err.reason || err.message));
    }
};

// ===== Auto-load on page load =====
window.addEventListener("DOMContentLoaded", async () => {
    if (window.ethereum?.selectedAddress) {
        userAddress = window.ethereum.selectedAddress;
        connectWalletBtn.innerText = userAddress.slice(0,6) + "..." + userAddress.slice(-4);
        await connectWallet();
    }
});
