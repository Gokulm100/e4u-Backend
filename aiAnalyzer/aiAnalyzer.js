// Groq AI Analysis Function
export async function analyzeDescription({ adTitle, category, subCategory, description }) {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY not configured');
  }

  const prompt = buildDynamicPrompt(adTitle, category, subCategory, description);

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `You are an expert at extracting and organizing information from classified ads. 
You analyze the content and return ONLY relevant key-value pairs as JSON. 
Never include fields with "Not specified" or empty values.
Always respond with valid JSON only, no explanation or additional text.`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Groq API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Extract JSON from response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON in AI response');
    }

    const parsedData = JSON.parse(jsonMatch[0]);

    // Remove any "Not specified" or empty values
    const cleanedData = {};
    for (const [key, value] of Object.entries(parsedData)) {
      if (value && 
          value !== "Not specified" && 
          value !== "N/A" && 
          value !== "Not mentioned" &&
          String(value).trim() !== "") {
        cleanedData[key] = value;
      }
    }

    return cleanedData;

  } catch (error) {
    console.error('Groq API Error:', error);
    throw error;
  }
}

// Build dynamic prompt based on category
function buildDynamicPrompt(adTitle, category, subCategory, description) {
  return `Analyze this classified ad and extract ALL relevant information as key-value pairs.

Ad Title: ${adTitle || 'Not provided'}
Category: ${category}
Sub-category: ${subCategory || 'General'}

Description:
"${description}"

Instructions:
1. Extract ONLY information that is EXPLICITLY mentioned in the description
2. Create clear, descriptive key names (e.g., "Property Type", "Number of Bedrooms", "Monthly Rent")
3. Keep values concise but complete
4. Use proper formatting (e.g., "₹15,000/month", "3 BHK", "1200 sq ft")
5. DO NOT include fields where information is missing or unclear
6. DO NOT add "Not specified" or similar placeholder values
7. Organize information logically for a ${category} listing
8. Include pricing, location, features, and specifications when mentioned
9. Return ONLY the JSON object, nothing else

Example output structure:
{
  "Property Type": "Independent House",
  "Bedrooms": "3 BHK",
  "Bathrooms": "3",
  "Furnishing": "Fully Furnished",
  "Furniture Included": "Beds, Wardrobes, Sofa, TV, Dining Table",
  "Kitchen Appliances": "Refrigerator, Stove, Utensils",
  "Parking": "Covered parking for 1 car",
  "Amenities": "24-hour water supply, Inverter backup",
  "Suitable For": "Families, Working professionals",
  "Nearby Facilities": "Schools, Supermarkets, Hospitals, Public transport",
  "Condition": "Well-maintained, Ready for occupancy",
  "Negotiable": "Yes"
}

Now analyze the description above and return ONLY the JSON:`;
}

export async function analyzeAd(mainAdData, relatedAdsData ) {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY not configured');
  }
  const prompt = `Analyze the following main ad data in the context of the related ads data provided.

Main Ad Data:
${JSON.stringify(mainAdData, null, 2)}

Related Ads Data:
${JSON.stringify(relatedAdsData, null, 2)}

Instructions:
1. Provide a concise summary highlighting key insights, trends, and recommendations.
2. Focus on helping the seller improve their ad performance.
3. Return the summary as a JSON array of objects with "title", "value", and "description" fields.
4. Ensure the JSON is STRICTLY valid: no trailing commas, no comments, no extra text, and all strings are double-quoted.
5. DO NOT include any additional text or explanation outside the JSON format.
6. Extract ONLY information that is EXPLICITLY mentioned in the Examples below.
7. LOCATION INSIGHTS can be identified from chat data of mainAdData and seller interactions.
Example output structure:
{     
"analysis":  [      
        {
            "title": "Inquiries",
            "value": "1",
            "description": "You have received 1 inquiry from an interested buyer, but they declined after discussing the price."
        },
        {
            "title": "Location Insights",
            "value": "Delhi",
            "description": "Majority of interested buyers are from Delhi and Mumbai."
        },
        {
            "title": "Price Comparison",
            "value": "Higher than similar ads",
            "description": "The price of your iPhone 17 Pro is higher than similar ads in the same location, which may be deterring potential buyers."
        },
        {
            "title": "Competitor Analysis",
            "value": "Similar ad sold for ₹90,000",
            "description": "A similar iPhone 17 Pro was sold for ₹90,000 in the same location, indicating a potential price adjustment opportunity."
        },
        {
            "title": "Highest Offer Received",
            "value": "₹100,000",
            "description": "The Highest offer received for your ad is ₹100,000, which is below your asking price."
        },
        {
            "title": "Ad Visibility",
            "value": "Low",
            "description": "Your ad has received fewer views compared to similar listings, suggesting it may benefit from improved keywords or better images."
        },
        {
            "title": "Open Offers",
            "value": "2",
            "description": "You currently have 2 open offers from interested buyers, indicating good interest in your ad."
        }
    ],
    "recommendations": [{
      "title": "Recommended Price",
      "description": "₹1,15,000 — Based on similar ads in this category, most competitive listings are priced between ₹1,10,000 and ₹1,20,000."
},{
      "title": "Optimal Price Range",
      "description": "For a faster sale, set your price between ₹1,12,000 and ₹1,18,000 as per recent market trends."
}]
}


Now provide the analysis in the specified STRICT JSON format:`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `You are an expert at analyzing classified ads data. 
You analyze the provided mainAdData with the relatedAdsData and return a concise summary highlighting key insights, trends, and recommendations helping a seller improve their ad performance.
Always respond with valid JSON only, no explanation or additional text. return ONLY relevant key-value pairs as JSON. 
Never include fields with "Not specified" or empty values.
Always respond with valid JSON ONLY.`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Groq API error: ${errorData.error?.message || response.statusText}`);
    }

const data = await response.json();
const aiResponse = data.choices[0].message.content;

// Extract JSON from response using regex
const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
if (!jsonMatch) {
  throw new Error('No valid JSON in AI response');
}

const validJSON = JSON.parse(jsonMatch[0]);

return validJSON;

  } catch (error) {
    console.error('Groq API Error:', error);
    throw error;
  }
}
export async function aiSearchAds(ads, searchCriteria) {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;

  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY not configured');
  }

  const criteriaString = typeof searchCriteria === 'string'
    ? searchCriteria
    : JSON.stringify(searchCriteria, null, 2);

  const prompt = `You are a classified ads search engine. The user wants to find ads matching their criteria.

USER SEARCH QUERY: "${criteriaString}"

ADS DATABASE:
${JSON.stringify(ads, null, 2)}

TASK:
1. First, understand what the user is looking for:
   - What product/category? (phones, laptops, furniture, etc.)
   - What price range? (above X, below X, between X and Y)
   - What location?
   - Any other specific requirements?

2. Filter the ads strictly based on these criteria:
   - For PRICE: Use exact numerical comparison
     * "above 8000" means price > 8000
     * "below 50000" means price < 50000
     * "between 5000 and 10000" means price >= 5000 AND price <= 10000
   
   - For CATEGORY: Match against category.name, subCategory, title, or description
     * "phones" matches: Electronics/Mobiles, or any ad with "phone" in title/description
   
   - For LOCATION: Match against the location field
   
   - For TEXT: Match against title and description semantically

3. Return ONLY the ads that meet ALL the criteria.

4. Output format - respond with ONLY this JSON structure, no other text:
{
    "ads": [
        {
            "_id": "69134a72aac1e1c788512ea3",
            "title": "Brand new iphone 17 pro for sale",
            "price": 180000,
            "location": "Kollam",
            "category": {
                "_id": "68f25ba4c11caea88a6c169e",
                "name": "Electronics",
                "description": "Devices and gadgets"
            },
            "subCategory": "Mobiles",
            "images": [],
            "description": "Brand new i phone 17 pro for sale ,16 gb 256 gb ,minor scratches ,6 months old 4 yrs warenty remaining ,full box available,charger available,black color,screen protector pre installed",
            "seller": {
                "_id": "69022878d5574642fc74e9a5",
                "name": "Akshaya A J",
                "email": "akshayaaj96@gmail.com"
            },
            "posted": "2025-11-11T14:38:42.159Z",
            "usersInterested": [
                "68f254e965a74d068dc12350",
                "68f3a30397a898814b9dabf4"
            ],
            "views": 87,
            "isActive": true,
            "isSold": false,
            "soldTo": null,
            "createdAt": "2025-11-11T14:38:42.161Z",
            "updatedAt": "2025-11-27T01:42:32.813Z",
            "__v": 0
        }
    ],
    "total": 1,
    "totalPages": 1
}

If no ads match, return:
{
  "ads": [],
  "total": 0,
  "totalPages": 0
}

CRITICAL: Return ONLY valid JSON. Do not include any explanation, markdown formatting, or additional text.`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `You are a precise search algorithm for classified ads. 

RULES:
1. Apply filters STRICTLY and LITERALLY
2. For numerical comparisons (price), use exact math: > means greater than, < means less than
3. Include an ad ONLY if it matches ALL specified criteria
4. When filtering by price:
   - "above 8000" → include only ads where price > 8000
   - "below 50000" → include only ads where price < 50000
   - Be precise with numbers
5. Always output valid JSON only - no markdown, no explanation
6. Double-check your price filtering before responding`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.1, // Very low for precise filtering
        max_tokens: 8000, // Higher to handle more results
        response_format: { type: "json_object" } // Forces JSON output (if supported by Groq)
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Groq API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    console.log('Raw AI Response:', data.choices[0].message.content);
    
    const aiResponse = data.choices[0].message.content.trim();

    // Try direct parsing first
    try {
      const validJSON = JSON.parse(aiResponse);
      
      // Validate structure
      if (!validJSON.ads || !Array.isArray(validJSON.ads)) {
        throw new Error('Invalid response structure - missing ads array');
      }
      
      console.log(`AI returned ${validJSON.total} matching ads`);
      return validJSON;
      
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.error('Response was:', aiResponse);
      
      // Try to extract JSON with regex as fallback
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in AI response');
      }
      
      const validJSON = JSON.parse(jsonMatch[0]);
      
      if (!validJSON.ads || !Array.isArray(validJSON.ads)) {
        throw new Error('Invalid response structure after regex extraction');
      }
      
      return validJSON;
    }

  } catch (error) {
    console.error('Groq API Error:', error);
    throw error;
  }
}
export async function analyzeChatForFraud(chats) {
try {
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
  
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY not configured');
  }
  const prompt = `Analyze the following chat conversations for potential fraud indicators.

Chat Conversations:
${JSON.stringify(chats, null, 2)}

Instructions:
1. Look for common fraud indicators such as:
   - Requests for payment outside the platform
   - Unusual urgency or pressure to complete a transaction
   - Inconsistent or evasive responses
   - Offers that seem too good to be true
   - Requests for personal or financial information
   - Suspicious links or attachments
   - Repeated changes in payment method
   - Lack of willingness to meet in person (for local transactions)
   - Offensive or aggressive behavior
   - sensory language or threats
   - sexual content or propositions
   - Any other red flags commonly associated with fraud
   
2. Provide a summary of any potential fraud indicators found in the conversations.
4. Return the summary as a JSON object with "fraudIndicators" and "recommendations" fields.
5. Keep the recommendations concise and actionable.
6. Ensure the JSON is STRICTLY valid: no trailing commas, no comments, no extra text, and all strings are double-quoted.
7. DO NOT include any additional text or explanation outside the JSON format.
8. DONT fabricate indicators; only report what is evident in the chat data.
9. DONT return Chat as fraud unless there are clear indicators.
10. If no fraud indicators are found, return an empty "fraudIndicators" array and NO recommendations.
Example output structure:
{
  "type":"PAYMENT_FRAUD",
  "fraudIndicators": [
    "User requested payment via wire transfer",
    "User pressured for quick transaction"
  ],
  "recommendations": "Be Cautious: Verify buyer identity, avoid off-platform payments, report suspicious activity."}

Now provide the analysis in the specified STRICT JSON format:`;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `You are an expert at analyzing chat conversations for fraud indicators. 
You analyze the provided chat data and return a summary of potential fraud indicators and recommendations.
Always respond with valid JSON only, no explanation or additional text. return ONLY relevant key-value pairs as JSON. 
Never include fields with "Not specified" or empty values.
Always respond with valid JSON ONLY.`
          },
          {
            role: "user",
            content: prompt
          }
        ],  
      })
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Groq API error: ${errorData.error?.message || response.statusText}`);
    }
    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Extract JSON from response using regex
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON in AI response');
    }

    const validJSON = JSON.parse(jsonMatch[0]);

    return validJSON;

  } catch (error) {
    console.error('Groq API Error:', error);
    throw error;
}
}
