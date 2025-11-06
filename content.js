// Content script - injected into web pages
// This script runs in the context of web pages, not the extension

console.log('Content script loaded on page:', window.location.href);

// Example: Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'GET_PAGE_INFO') {
        sendResponse({
            title: document.title,
            url: window.location.href,
            timestamp: new Date().toISOString()
        });
    }
});

// Example: Communicate with the page
window.addEventListener('load', () => {
    console.log('Page fully loaded');
});
