document.addEventListener('DOMContentLoaded', () => {
    initialize();
});

function initialize() {
    clickViewMoreButtons().then(() => {
        debouncedGetContent();
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

function clickViewMoreButtons(observer) {
    return new Promise((resolve) => {
        let viewMoreButtons = document.querySelectorAll('.entry-body__view-more');

        if (viewMoreButtons.length === 0) {
            if(observer){
                observer.disconnect();
            }
            resolve();
            return;
        }

        viewMoreButtons.forEach(button => {
            button.click();
        });

        resolve();
    });
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait, ...args);
    };
}

const debouncedClickViewMoreButtons = debounce((observer) => {
    clickViewMoreButtons(observer).then(() => {
    });
}, 500);

const debouncedGetContent = debounce(() => {
    getContent().then(() => {
    });
}, 500);

const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.addedNodes.length) {
            debouncedClickViewMoreButtons(observer);
        }
    });
});

observer.observe(document.body, { childList: true, subtree: true });

function getContent() {
    return new Promise((resolve, reject) => {
        const entryBodies = document.querySelectorAll('.entry-body');
        const crmContents = [];
        const crmName = document.querySelectorAll('.party-details__title');

        if(crmName.length>0){

            chrome.storage.local.set({ recipientName: crmName[0].outerText}, function() {
                if (chrome.runtime.lastError) {
                    console.error(
                        "Error setting recipient name to " + JSON.stringify(crmName[0].outerText) +
                        ": " + chrome.runtime.lastError.message
                    );         
                } 
            });
        }

        entryBodies.forEach(entryBody => {
            const preElement = entryBody.querySelector('pre.pre');

            if (preElement && preElement.textContent.trim() !== '') {
                let trimmedContent = preElement.textContent.trim();
                let cleanedContent = trimmedContent
                    .replace(/[_*~`>#-]+/g, '')             // Removes *, _, ~, `, #, >, and - symbols
                    .replace(/\[(.*?)\]\(.*?\)/g, '$1')     // Removes link URLs but keeps the link text
                    .replace(/!\[.*?\]\(.*?\)/g, '')        // Removes images
                    .replace(/[*_]{1,2}([^*_]+)[*_]{1,2}/g, '$1') // Removes bold/italic markers
                    .replace(/```[\s\S]*?```/g, '')         // Removes code blocks
                    .replace(/`([^`]+)`/g, '$1');           // Removes inline code
        
                crmContents.push(cleanedContent);                
                
                
            }
        });

        chrome.storage.local.set({ content: crmContents }, function() {
            if (chrome.runtime.lastError) {
                console.error(
                    "Error setting crmContents to " + JSON.stringify(crmContents) +
                    ": " + chrome.runtime.lastError.message
                );
                reject(chrome.runtime.lastError);
            } else {
                resolve(crmContents);
            }
        });
    });
}

function getEmail(){
    return new Promise((resolve, reject) => {
        const emailEditorDiv = document.querySelector('div.email-editor-body__editor > div[contenteditable="true"]');
        if (emailEditorDiv) {
            const emailContent = emailEditorDiv.innerHTML.trim();

            chrome.storage.local.set({ emailContent: emailContent}, function() {
                if (chrome.runtime.lastError) {
                    console.error(
                        "Error setting email content to " + JSON.stringify(emailContent) +
                        ": " + chrome.runtime.lastError.message
                    );
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(emailContent);
                }
            })
        }
    })
}

// Listen for messages from popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "CheckContentAndGenerateEmail") {
        getContent().then(() => {
            chrome.runtime.sendMessage({ action: "generateEmail" }, function(response) {
                CreateEmail(response.email.emailBody.replace('**\n\n', ''), response.email.subjectLine);
                sendResponse({ email: response.email });
            });
        }).catch((error) => {
            console.error('Error getting content:', error);
            sendResponse({ error: error.message });
        });

        return true; 
    }

    if (request.action === "CheckContentAndGenerateSummary") {
        getContent().then(() => {
            chrome.runtime.sendMessage({ action: "generateSummary" }, function(response) {
                ShowSummary(response.generatedSummary.summary);
                sendResponse({ summary: response.generatedSummary });
            });
        }).catch((error) => {
            console.error('Error getting content:', error);
            sendResponse({ error: error.message });
        });

        return true;
    }

    if(request.action === "urlChanged") {
        observer.disconnect();
        initialize();
    }

    if(request.action === "CheckContentAndRewrite"){
        getEmail().then(() => {
            chrome.runtime.sendMessage({ action: "generateRewrite" }, function(response) {
                RewriteContent(response.generatedEmail.emailContent)
                sendResponse({ rewrite: response.rewrite });
            });
        }).catch((error) => {
            console.error('Error getting content:', error);
            sendResponse({ error: error.message });
        });

        return true;
    }

});

function RewriteContent(updatedContent){
    const emailEditorDiv = document.querySelector('div.email-editor-body__editor > div[contenteditable="true"]');
    if (emailEditorDiv) {
        const formattedEmailContent = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
            ${updatedContent
                .split('\n')
                .filter(line => line.trim() !== '')
                .map(line => `<p>${line}</p>`)
                .join('')}
        </div>
        `;
        emailEditorDiv.innerHTML = formattedEmailContent;
    }
}

function ShowSummary(summaryContent) {
    const logActivityButton = document.querySelector('button[data-pendo="add-note-button"]');

    if(logActivityButton){
        logActivityButton.click();

        const observer = new MutationObserver((mutations, obs) => {
            const noteEditorTextArea = document.querySelector('textarea.entry-modal__body');

            if(noteEditorTextArea){
                noteEditorTextArea.value = summaryContent;

                noteEditorTextArea.dispatchEvent(new Event('input', { bubbles: true }));
                noteEditorTextArea.dispatchEvent(new Event('change', { bubbles: true }));

                const saveButton = document.querySelector('footer.modal__footer > div.form-actions > button.button--primary[type="submit"]');

                if(saveButton){
                    saveButton.click();
                } else {
                    console.error('Save Button not found');
                }

                obs.disconnect();
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    } else {
        console.error('Log Activity button not found');
    }
}

function CreateEmail(emailContent, subjectLine) {
    const sendEmailButton = document.querySelector('button[data-pendo="send-email-button"]');

    if (sendEmailButton) {
        sendEmailButton.click();

        const observer = new MutationObserver((mutations, obs) => {
            const emailSujectLineEditorDiv = document.querySelector('div.email-editor-subject__editor > div[contenteditable="true"]');
            if(emailSujectLineEditorDiv) {
                emailSujectLineEditorDiv.innerHTML = subjectLine.replace('Subject:', '').replace('**', '');
            }

            const emailEditorDiv = document.querySelector('div.email-editor-body__editor > div[contenteditable="true"]');
            if (emailEditorDiv) {
                const formattedEmailContent = `
                <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                    ${emailContent
                        .split('\n')
                        .filter(line => line.trim() !== '')
                        .map(line => `<p>${line}</p>`)
                        .join('')}
                </div>
                `;
                emailEditorDiv.innerHTML = formattedEmailContent;
            }

            if(emailSujectLineEditorDiv && emailEditorDiv){
                obs.disconnect();
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    } else {
        console.error('Send Email button not found');
    }
}
