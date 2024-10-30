/*chrome.storage.local.set({ apiKeyPhonely: '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' }, function() {
    console.log('Phonely API key stored');
});

chrome.storage.local.set({ apiKeySbf: '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' }, function() {
    console.log('SBF API key stored');
}); */





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

        let brand = 'Phonely'
        let customerPersona = 'Age: 55-70. Occupation: Retired or nearing retirement. Location: Suburban or rural areas with traditional landline services, such as smaller towns where fiber is being installed (e.g., Meppershall in Bedfordshire). Marital Status: Married or widowed, with children who have moved out. Technology Comfort Level: Moderate to low. Sarah uses technology like smartphones or tablets but prefers simpler, familiar communication methods like her landline.Primary Communication Needs: Staying connected with family (children, grandchildren) and close friends. Relies heavily on her landline for clear, uninterrupted calls, especially in emergencies.'
        let templatesUrl = 'https://docs.google.com/document/d/1bCjic-NmhpZYs9tN5e_9Sh1Mh5Nh_ed-m3DeGZNTOHo/edit?usp=sharing';
        let plansUrl = 'https://www.phonely.co.uk/plans'
        let prompt = `Write me an email follow up to an existing lead for ${brand}, a UK-based digital landline service. The email should use the "four c's" framework to create clea, concise, compelling and credible copy for the following customer persona: ${customerPersona}. Use this checklist to ensure that our message is effectively communicated and persuades the reader to take action. Include talking points such as our built-in scam protection and UK-based customer service. Do NOT summarise the 4 c's in the content, simply just return me a well formatted email ready to send. The Email should be written in first person. Here's the notes and recent emails from the CRM for this customer: \n\n${crmContent.join('\n\n')}\n\n. Provide the subject line and the email body separately:Subject Line:\nEmail Body: - IMPORTANT: Use the following URL's for reference: existing email templates: ${templatesUrl}, a link to our plans page: ${plansUrl}. Remember to keep the email friendly and informative, and to include a clear call to action. DO NOT INCLUDE AN EMAIL FOOTER OR SIGNATURE. Don’t always use the most natural words. Use the following words fewer than 3 times on this page: unique, ensure, utmost. Before outputting the content, review it for the following words and rewrite those sentences with appropriate alternatives: meticulous, meticulously, navigating, complexities, realm, bespoke, tailored, towards, underpins, everchanging, ever-evolving, the world of, not only, seeking more than just, designed to enhance, it’s not merely, our suite, it is advisable, daunting, in the heart of, when it comes to, in the realm of, amongst unlock the secrets, unveil the secrets, and robust. Ensure heterogeneous paragraphs. Ensure heterogeneous sentence lengths. And stick to primarily short, straightforward sentences. Do not include any fluff when producing content. Each sentence should provide value to the overall goal of the content piece. Strictly follow this guideline. Engagement is the highest priority. Be conversational, empathetic, and occasionally humorous. Use idioms, metaphors, anecdotes and natural dialogue. Finally, take a deep breath and take it step by step. Do not begin the email with "I hope this message finds you well", try and keep the emails concise, and to the point.`;

        if (url && url.includes('switchboardfree.capsulecrm')) {
            // SBF CRM - Let's update the prompts
            customerPersona = 'Demographics: Age: 38, Gender: Female, Location: London, UK, Occupation: Office Manager, Industry: Professional Services, Company Size: 15-50 employees, Education: Bachelor’s degree, Income: £50,000 per year, Background: office manager or business owner at a mid-sized company. Her responsibilities include managing day-to-day operations, ensuring smooth communication between her firm’s employees and clients, and maintaining the firm’s technology and office systems. The law firm has a mix of in-office staff and remote workers. Managing client calls is critical to their success, and they need a reliable, professional communication system. Challenges: Inefficient Communication: The current phone system is outdated and can’t handle remote work seamlessly. Missed calls and a lack of call forwarding features make it difficult to ensure that client calls are handled professionally. High Operational Costs: The firm is paying high rates for multiple phone lines and services that don’t integrate with their current office setup. Remote Team Management: As the firm adopts a hybrid work model, Emily struggles to maintain efficient communication across in-office and remote staff members. Client Confidentiality: Ensuring that sensitive client information is handled securely is critical for Emily and the law firm’s compliance requirements.'
            brand = 'SwitchboardFREE'

            prompt = `Write me an email follow up to an existing lead for ${brand}, a UK-based digital landline service. The email should use the "four c's" framework to create clea, concise, compelling and credible copy for the following customer persona: ${customerPersona}. Use this checklist to ensure that our message is effectively communicated and persuades the reader to take action. Include talking points such as our built-in scam protection and UK-based customer service. Do NOT summarise the 4 c's in the content, simply just return me a well formatted email ready to send. The Email should be written in first person. Here's the notes and recent emails from the CRM for this customer: \n\n${crmContent.join('\n\n')}\n\n. Provide the subject line and the email body separately:Subject Line:\nEmail Body: - Remember to keep the email friendly and informative, and to include a clear call to action. DO NOT INCLUDE AN EMAIL FOOTER OR SIGNATURE. Don’t always use the most natural words. Use the following words fewer than 3 times on this page: unique, ensure, utmost. Before outputting the content, review it for the following words and rewrite those sentences with appropriate alternatives: meticulous, meticulously, navigating, complexities, realm, bespoke, tailored, towards, underpins, everchanging, ever-evolving, the world of, not only, seeking more than just, designed to enhance, it’s not merely, our suite, it is advisable, daunting, in the heart of, when it comes to, in the realm of, amongst unlock the secrets, unveil the secrets, and robust. Ensure heterogeneous paragraphs. Ensure heterogeneous sentence lengths. And stick to primarily short, straightforward sentences. Do not include any fluff when producing content. Each sentence should provide value to the overall goal of the content piece. Strictly follow this guideline. Engagement is the highest priority. Be conversational, empathetic, and occasionally humorous. Use idioms, metaphors, anecdotes and natural dialogue. Finally, take a deep breath and take it step by step. Do not begin the email with "I hope this message finds you well", try and keep the emails concise, and to the point.`;

        } else if (url && url.includes('datasoap.capsulecrm')) {
            // Datasoap CRM - Update the prompts
            customerPersona = 'Demographics: Age: 42, Gender: Male, Location: Greater London, UK, Occupation: Business Owner/Director, Industry: Commercial Cleaning, Company Size: 5-20 employees, Education: Trade qualification or business management background, Income: £45,000-£75,000 per year. Background: Owns or manages a commercial cleaning business serving offices, schools, or industrial facilities. Primary concerns include managing cleaning schedules, staff allocation, and maintaining cleaning standards. Challenges: Staff Management: Coordinating cleaning teams across multiple locations, Managing Supplies: Tracking and ordering cleaning supplies efficiently, Quality Control: Ensuring consistent cleaning standards across all sites, Client Communication: Maintaining professional relationships with facility managers.';
            brand = 'Datasoap';

            prompt = `Write me an email follow up to an existing lead for ${brand}, a UK-based cleaning management software solution. The email should use the "four c's" framework to create clear, concise, compelling and credible copy for the following customer persona: ${customerPersona}. Use this checklist to ensure that our message is effectively communicated and persuades the reader to take action. Include talking points such as our automated scheduling system and real-time reporting features. Do NOT summarise the 4 c's in the content, simply just return me a well formatted email ready to send. The Email should be written in first person. Here's the notes and recent emails from the CRM for this customer: \n\n${crmContent.join('\n\n')}\n\n. Provide the subject line and the email body separately:Subject Line:\nEmail Body: - Remember to keep the email friendly and informative, and to include a clear call to action. DO NOT INCLUDE AN EMAIL FOOTER OR SIGNATURE. Don't always use the most natural words. Use the following words fewer than 3 times on this page: unique, ensure, utmost. Before outputting the content, review it for the following words and rewrite those sentences with appropriate alternatives: meticulous, meticulously, navigating, complexities, realm, bespoke, tailored, towards, underpins, everchanging, ever-evolving, the world of, not only, seeking more than just, designed to enhance, it's not merely, our suite, it is advisable, daunting, in the heart of, when it comes to, in the realm of, amongst unlock the secrets, unveil the secrets, and robust. Ensure heterogeneous paragraphs. Ensure heterogeneous sentence lengths. And stick to primarily short, straightforward sentences. Do not include any fluff when producing content. Each sentence should provide value to the overall goal of the content piece. Strictly follow this guideline. Engagement is the highest priority. Be conversational, empathetic, and occasionally humorous. Use idioms, metaphors, anecdotes and natural dialogue. Finally, take a deep breath and take it step by step. Do not begin the email with "I hope this message finds you well", try and keep the emails concise, and to the point.`;
        }

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
            const [subjectLine, emailBody] = generatedText.split('Email Body:').map(part => part.trim());

            return { subjectLine, emailBody };
        }
    } catch (error) {
        console.error('Error generating email:', error);
        throw error;
    }
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