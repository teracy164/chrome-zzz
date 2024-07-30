document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('start').addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            console.log('tabs', tabs)
            if (tabs.length > 0) {
                console.log('Active tab ID:', tabs[0].id);
                chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    files: ['content.js']
                }, (results) => {
                    if (chrome.runtime.lastError) {
                        console.error('Script injection failed:', chrome.runtime.lastError);
                    } else {
                        console.log('Content script injected:', results);
                    }
                });
            } else {
                console.error('No active tab found');
            }
        });
    });
});
