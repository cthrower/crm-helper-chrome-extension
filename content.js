document.addEventListener('DOMContentLoaded', () => {
    initialize();
});

function initialize() {
    // Find the target div
    // const targetDiv = document.querySelector('.panel__content-right .party-index__action-buttons');

    // if (targetDiv) {
    //     // Create the Generate Email button
    //     const generateEmailButton = document.createElement('button');
    //     generateEmailButton.className = 'button button--secondary button--small';
    //     generateEmailButton.textContent = 'Generate Email';
    //     generateEmailButton.addEventListener('click', () => {
    //         console.log('Generate Email button clicked');
    //         chrome.runtime.sendMessage({ action: "CheckContentAndGenerateEmail" });
    //     });

    //     // Create the Summarise button
    //     const summariseButton = document.createElement('button');
    //     summariseButton.className = 'button button--primary button--small';
    //     summariseButton.textContent = 'Summarise';
    //     summariseButton.addEventListener('click', () => {
    //         console.log('Summarise button clicked');
    //         chrome.runtime.sendMessage({ action: "CheckContentAndGenerateSummary" });
    //     });

    //     // Append the buttons to the target div
    //     //targetDiv.appendChild(generateEmailButton);
    //     //targetDiv.appendChild(summariseButton);
    // } else {
    //     console.error('Target div not found');
    // }

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

        entryBodies.forEach(entryBody => {
            const preElement = entryBody.querySelector('pre.pre');

            if (preElement && preElement.textContent.trim() !== '') {
                crmContents.push(preElement.textContent.trim());
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
                emailSujectLineEditorDiv.innerHTML = subjectLine.replace('**Subject Line:** ', '').replace('**', '');
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

// Observer to detect when the email editor popup opens
const emailEditorObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.addedNodes.length) {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    const emailEditorToolbar = node.querySelector('div.email-editor-toolbar');
                    if (emailEditorToolbar) {
                        // Create the new button
                        const newButton = document.createElement('button');
                        newButton.className = 'button button--secondary button--small';
                        newButton.textContent = 'New Button';
                        newButton.addEventListener('click', () => {
                            // Add your button click logic here
                        });

                        // Append the new button to the email editor toolbar
                        //emailEditorToolbar.appendChild(newButton);
                        emailEditorObserver.disconnect(); // Stop observing once the button is added
                    }
                }
            });
        }
    });
});

// Start observing the document body for changes
emailEditorObserver.observe(document.body, { childList: true, subtree: true });