document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('start').addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length > 0) {
                /** @type HTMLInputElement */
                const elSwitch = document.getElementById('switch-score');
                const showScore = elSwitch.checked;

                chrome.tabs.sendMessage(tabs[0].id, { showScore }, (response) => {
                    console.log('Response from content script:', response);
                });
            }
        });
    });
});
