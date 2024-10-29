document.getElementById('generate').addEventListener('click', () => {
    document.getElementById('buttons').classList.add('hidden');
    document.getElementById('loading').classList.remove('hidden');

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: "CheckContentAndGenerateEmail" }, function(response) {
            if (chrome.runtime.lastError) {
                console.error('Runtime error:', chrome.runtime.lastError);
                return;
            }
            if (response.error) {
                console.error('Response error:', response.error);
            } else {
                chrome.tabs.sendMessage(tabs[0].id, { action: "CreateEmail" }, function(response) {
                    window.close();
                });
            }
        });
    });
});

document.getElementById('summary').addEventListener('click', () => {
    document.getElementById('buttons').classList.add('hidden');
    document.getElementById('loading').classList.remove('hidden');

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: "CheckContentAndGenerateSummary" }, function(response) {
            if (chrome.runtime.lastError) {
                console.error('Runtime error:', chrome.runtime.lastError);
                return;
            }
            if (response.error) {
                console.error('Response error:', response.error);
            } else {
                window.close();
            }
        });
    });
});

document.getElementById('rewrite').addEventListener('click', () => {
    document.getElementById('buttons').classList.add('hidden');
    document.getElementById('loading').classList.remove('hidden');

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: "CheckContentAndRewrite" }, function(response) {

            if (chrome.runtime.lastError) {
                console.error('Runtime error:', chrome.runtime.lastError);
                return;
            }
            if (response.error) {
                console.error('Response error:', response.error);
            } else {
                window.close();
            }
        });
    });
});