chrome.storage.local.set({ testMode: false }, function() {
    console.log('Test Mode Stored');
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    

    // Generate an email via openAI
    if (message.action === "generateEmail")  {
        getOpenAIEmail()
            .then(generatedEmail => {
                
                sendResponse({ email: generatedEmail });
            })
            .catch(error => {
                sendResponse({ error: error.message });
            });
        return true
    }

    // Generate a summary via openAI
    if(message.action === "generateSummary"){
        getOpenAISummary()
            .then(generatedSummary => {
                sendResponse({ generatedSummary });                
            })
            .catch(error => {
                sendResponse({ error: error.message });
            });
        return true
    }    

    if(message.action === "generateRewrite"){
        getOpenAIRewrite()
            .then(generatedEmail => {
                sendResponse({ generatedEmail });
            })
            .catch(error => {
                sendResponse({ error: error.message });
            });
        return true
    }
});

async function getOpenAIRewrite(){
    const apiKey = await getApiKey();
    const apiUrl = 'https://api.openai.com/v1/chat/completions';

    try {
        const emailContent = await getEmailContent();

        const prompt = `Check the following email content for spelling and grammar mistakes using UK British English. Correct any errors you find and output the corrected email copy ONLY, nothign more. Do NOT rewrite the email, simply fix any typos, grammar or spelling mistakes. Here's the email copy: \n\n${emailContent}\n\n`

        const requestBody = {
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            max_completion_tokens: 1000,
            temperature: 0.5
        };

        // Wrap chrome.storage.local.get in a Promise
        const testMode = await new Promise((resolve, reject) => {
            chrome.storage.local.get(['testMode'], function(result) {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(result.testMode);
                }
            });
        });

        if(testMode === true){
            // Testing, return some test data
            const emailContent = 'Here is some random summary';
            return {emailContent};
        } else { 
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(requestBody)
            });
    
            if (!response.ok) {
                throw new Error(`OpenAI API request failed with status ${response.status}`);
            }
    
            const data = await response.json();
            const emailContent = data.choices[0].message.content.trim();
    
            return { emailContent };

        }
    } catch (error) {
        console.error('Error generating email:', error);
        throw error;
    }
}

async function getOpenAISummary(){
    const apiKey = await getApiKey();
    const apiUrl = 'https://api.openai.com/v1/chat/completions';

    try {
        const crmContent = await getPageData();

        const prompt = `IDENTITY You are an all-knowing AI with a 476 I.Q. that deeply understands concepts. GOAL You create concise summaries of--or answers to--arbitrary input. STEPS Deeply understand the input. Think for 912 virtual minutes about the meaning of the input. Create a virtual mindmap of the meaning of the content in your mind. Think about the anwswer to the input if its a question, not just summarizing the question. OUTPUT Output a title of "Automated Summary", followed by one section called "Summary" that perfectly capture the true essence of the input, its answer, and/or its meaning, up-to 50 words. OUTPUT FORMAT Output the summary as short, concise text. NOTE: Do not just make the sentences shorter. Reframe the meaning as best as possible for each depth level. Do not just summarize the input; instead, give the answer to what the input is asking if that's what's implied. Additionally, include a summary of suggested next steps at the end - the suggested next steps should be for our internal sales team and how they should handle this lead. Using this prompt, craft me a summary of the following CRM notes: \n\n${crmContent.join('\n\n')}\n\n`

        const requestBody = {
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            max_completion_tokens: 1000,
            temperature: 0.8
        };

        // Wrap chrome.storage.local.get in a Promise
        const testMode = await new Promise((resolve, reject) => {
            chrome.storage.local.get(['testMode'], function(result) {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(result.testMode);
                }
            });
        });

        if(testMode === true){
            // Testing, return some test data
            const summary = 'Here is some random summary';
            return {summary};
        } else { 
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(requestBody)
            });
    
            if (!response.ok) {
                throw new Error(`OpenAI API request failed with status ${response.status}`);
            }
    
            const data = await response.json();
            const generatedText = data.choices[0].message.content.trim();
    
            // Parse the response to separate the subject line and email body
            const summary = generatedText.split('Email Body:').map(part => part.trim());
    
            return { summary };

        }
    } catch (error) {
        console.error('Error generating email:', error);
        throw error;
    }
}

async function getOpenAIEmail() {
    try {
        const tabs = await new Promise((resolve, reject) => {
            chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(tabs);
                }
            });
        });

        const tab = tabs[0];
        const url = tab.url;

        const apiKey = await getApiKey(url);
        const apiUrl = 'https://api.openai.com/v1/chat/completions';
        const crmContent = await getPageData();
        const recipientName = await getRecipName();

        // Fetch the prompt with a Promise to ensure it is fully loaded before proceeding
        const prompt = await new Promise(async (resolve, reject) => {
            try {
                let result;
                if (url && url.includes('switchboardfree.capsulecrm')) {
                    result = await fetchPrompts(2);
                } else if (url && url.includes('liquid11.capsulecrm')) {
                    result = await fetchPrompts(3);
                } else {
                    result = await fetchPrompts(1);
                }

                if (result) {
                    resolve(result);
                } else {
                    reject(new Error('Could not load prompt template'));
                }
            } catch (error) {
                reject(error);
            }
        });

        

        const requestBody = {
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt + crmContent + `recipients name for this email is : ${recipientName}. Use first name only and start email with 'Hi' then their first name.`}],
            max_completion_tokens: 1000,
            temperature: 0.8
        };

        // Wrap chrome.storage.local.get in a Promise
        const testMode = await new Promise((resolve, reject) => {
            chrome.storage.local.get(['testMode'], function(result) {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(result.testMode);
                }
            });
        });

        if (testMode === true) {
            // Testing, return some test data
            const subjectLine = 'Test Subject Line';
            const emailBody = 'Here\'s some random email body';
            return { subjectLine, emailBody };
        } else {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`OpenAI API request failed with status ${response.status}`);
            }

            const data = await response.json();
            const generatedText = data.choices[0].message.content.trim();

            // Parse the response to separate the subject line and email body
            console.log('email content', generatedText);
            const [subjectLine, emailBody] = generatedText.split('Email Body:').map(part => part.trim());

            return { subjectLine, emailBody };
        }
    } catch (error) {
        console.error('Error generating email:', error);
        throw error;
    }
}

function getRecipName(){
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['recipientName'], function(result) {
            if (chrome.runtime.lastError) {
                console.error('Error getting content from storage:', chrome.runtime.lastError);
                reject(chrome.runtime.lastError);
            } else {
                resolve(result.recipientName || []);
            }
        });
    });
}

function getPageData() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['content'], function(result) {
            if (chrome.runtime.lastError) {
                console.error('Error getting content from storage:', chrome.runtime.lastError);
                reject(chrome.runtime.lastError);
            } else {
                resolve(result.content || []);
            }
        });
    });
}

function getEmailContent(){
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['emailContent'], function(result) {
            if (chrome.runtime.lastError) {
                console.error('Error getting email content from storage:', chrome.runtime.lastError);
                reject(chrome.runtime.lastError);
            } else {
                resolve(result.emailContent || []);
            }
        });
    })
}

function getApiKey(url) {
    return new Promise((resolve, reject) => {
        if (url && url.includes('switchboardfree.capsulecrm')) {
            chrome.storage.local.get('apiKeySbf', function(result) {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else if (!result.apiKeySbf) {
                    reject(new Error('SBF API key not found. Please set up your API keys.'));
                } else {
                    resolve(result.apiKeySbf);
                }
            });
        } else if (url && url.includes('liquid11.capsulecrm')) {
            chrome.storage.local.get('apiKeyDatasoap', function(result) {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else if (!result.apiKeyDatasoap) {
                    reject(new Error('Datasoap API key not found. Please set up your API keys.'));
                } else {
                    resolve(result.apiKeyDatasoap);
                }
            });
        } else {
            chrome.storage.local.get('apiKeyPhonely', function(result) {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else if (!result.apiKeyPhonely) {
                    reject(new Error('Phonely API key not found. Please set up your API keys.'));
                } else {
                    resolve(result.apiKeyPhonely);
                }
            });
        }
    });
}

function handleUrlChange(details) {
    chrome.tabs.sendMessage(details.tabId, { action: "urlChanged" });
}

chrome.webNavigation.onHistoryStateUpdated.addListener(handleUrlChange);
chrome.webNavigation.onCompleted.addListener(handleUrlChange);
chrome.webNavigation.onReferenceFragmentUpdated.addListener(handleUrlChange);

// Configuration object for Pastebin IDs and refresh intervals
const CONFIG = {
    PASTEBIN_IDS: {
        phonely: 'wQyxtVzV',
        sbf: 'gHvHd2Uf',
        datasoap: 'varVdBJ3'
    },
   
    PASTEBIN_API_KEY: 'JX-QgtqXr8JMRqc6DmuGwhSi78LGW2_n'
};

// Function to fetch prompts from Pastebin
async function fetchPrompts(number) {
    try {
        //let phonelyPrompt;
        switch(number) {
            case 1:
                const response = await fetch(`https://pastebin.com/raw/${CONFIG.PASTEBIN_IDS.phonely}?v=${Date.now()}`);
                const phonelyPrompt = await response.text();
                return phonelyPrompt
            case 2:
                const response2 = await fetch(`https://pastebin.com/raw/${CONFIG.PASTEBIN_IDS.sbf}?v=${Date.now()}`);
                const sbfPrompt = await response2.text();
                return sbfPrompt
            case 3:
                const response3 = await fetch(`https://pastebin.com/raw/${CONFIG.PASTEBIN_IDS.datasoap}?v=${Date.now()}`);
                const datasoapPrompt = await response3.text();
                return datasoapPrompt
        }
    } catch (error) {
        console.error('Error fetching prompts:', error);
    }
}