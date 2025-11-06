// Background service worker
// This runs in the background and handles events that occur outside of any page context

// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        console.log('Extension installed!');
        // You can open a welcome page here if needed
        // chrome.tabs.create({ url: 'onboarding.html' });
    } else if (details.reason === 'update') {
        console.log('Extension updated to version', chrome.runtime.getManifest().version);
    }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'GREETING_SHOWN') {
        console.log('Greeting shown:', request.message);
        console.log('Shown in tab:', sender.tab?.url);
        sendResponse({ status: 'success', message: 'Greeting logged' });
    }
});

// Example: Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        console.log('Tab loaded:', tab.url);
    }
});

// Example: Listen for tab activation
chrome.tabs.onActivated.addListener((activeInfo) => {
    console.log('Tab activated:', activeInfo.tabId);
});
