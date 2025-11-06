// Pop-up script - handles user interactions in the popup window
document.addEventListener('DOMContentLoaded', () => {
    // Display current URL
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const currentTab = tabs[0];
        if (currentTab && currentTab.url) {
            document.getElementById('currentUrl').textContent = currentTab.url;
        }
    });

    // Handle greeting button click
    document.getElementById('greetButton').addEventListener('click', () => {
        const messageElement = document.getElementById('message');
        const greetings = [
            'Hello from your extension! 🎉',
            'Welcome to Chromium extensions! 🚀',
            'You are awesome! ⭐',
            'Happy coding! 💻',
            'Extension power activated! ⚡'
        ];
        
        const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
        messageElement.textContent = randomGreeting;
        
        // Send message to background script
        chrome.runtime.sendMessage({ type: 'GREETING_SHOWN', message: randomGreeting });
    });
});
