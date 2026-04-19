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

export async function analyzeAd(mainAdData, relatedAdsData) {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY not configured');

  const systemPrompt = `You are a classified ads performance analyst. Analyze a seller's ad against related listings and return ONLY a strictly valid JSON object — no markdown, no explanation, no extra text.

ANALYSIS ITEMS (include only those supported by the data):
- Inquiries         → count of unique buyers who contacted the seller
- Location Insights → buyer locations extracted from chat data
- Price Comparison  → how the ad's price compares to similar ads nearby
- Competitor Analysis → notable sold/active similar ads and their prices
- Ad Visibility     → views/engagement relative to similar listings
- Open Offers       → count of active, unresolved buyer offers

RECOMMENDATIONS (always include if data supports it):
- Recommended Price → a single suggested price based on comparable listings
- Optimal Price Range → price band for a faster sale based on market trends

STRICT RULES:
- Only include items explicitly supported by the provided data — never fabricate
- value field: short, factual (e.g. "3", "Delhi", "Higher than similar ads") — no ₹ symbol in value
- description field: 1–2 sentences, second person ("Your ad...", "You have...")
- Omit any analysis item if the data does not support it
- recommendations array may be empty [] if data is insufficient`;

  const userPrompt = `Analyze this ad against the related ads data below.

MAIN AD:
${JSON.stringify(mainAdData, null, 2)}

RELATED ADS:
${JSON.stringify(relatedAdsData, null, 2)}

Return ONLY this JSON structure:
{
  "analysis": [
    {
      "title": "<item title>",
      "value": "<short factual value>",
      "description": "<1–2 sentences, second person>"
    }
  ],
  "recommendations": [
    {
      "title": "<Recommended Price | Optimal Price Range>",
      "description": "<concise actionable insight with ₹ amounts>"
    }
  ]
}`;

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
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 800
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Groq API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No valid JSON in AI response');

    const parsed = JSON.parse(jsonMatch[0]);

    // Post-processing: ensure shape is always consistent
    return {
      analysis: Array.isArray(parsed.analysis) ? parsed.analysis : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : []
    };

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
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY not configured');

  const systemPrompt = `You are a fraud detection analyst for a classified ads platform. Analyze chat conversations and return ONLY a strictly valid JSON object — no markdown, no explanation, no extra text.

FRAUD INDICATORS TO DETECT:
- Off-platform payment requests (wire transfer, crypto, gift cards, UPI outside app)
- Requests for personal/financial/account information
- Suspicious urgency or pressure to transact quickly
- Offers that are unrealistically good
- Inconsistent, evasive, or scripted responses
- Repeated payment method changes
- Refusal to meet in person for local deals
- Suspicious links or attachments
- Offensive, threatening, or aggressive language
- Sexual content or propositions

CLASSIFICATION TYPES (use the most applicable):
PAYMENT_FRAUD | IDENTITY_THEFT | PHISHING | SCAM_OFFER | HARASSMENT | SEXUAL_CONTENT | SAFE

STRICT RULES:
- Only report indicators explicitly present in the chat — never fabricate
- Do NOT classify as fraud unless there are clear, explicit signals
- If no fraud found: return type "SAFE", empty fraudIndicators array, and omit recommendations entirely
- fraudIndicators must be short, factual observations (not opinions)
- recommendations must be one concise actionable sentence`;

  const userPrompt = `Analyze these chat conversations for fraud:

${JSON.stringify(chats, null, 2)}

Return ONLY this JSON structure:
{
  "type": "<CLASSIFICATION_TYPE>",
  "fraudIndicators": ["<observed signal>", ...],
  "recommendations": "<one concise actionable sentence — omit this field entirely if type is SAFE>"
}`;

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
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 400
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Groq API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No valid JSON in AI response');

    const parsed = JSON.parse(jsonMatch[0]);

    // Post-processing: ensure shape is always consistent
    return {
      type: parsed.type ?? "SAFE",
      fraudIndicators: Array.isArray(parsed.fraudIndicators) ? parsed.fraudIndicators : [],
      ...(parsed.recommendations ? { recommendations: parsed.recommendations } : {})
    };

  } catch (error) {
    console.error('Groq API Error:', error);
    throw error;
  }
}
export async function analyzeAiPriceInsights(mainAdData, relatedAdsData) {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY not configured');

  const systemPrompt = `You are a classified ads analyst. Your ONLY job is to extract buyer offers from chat data and return a strict JSON object.

OFFER EXTRACTION RULES (non-negotiable):
- A valid offer = a buyer explicitly states a numeric price they will pay (e.g. "I'll pay ₹30,000", "will you take 25k?")
- NOT valid: seller's listed price, price questions, general price talk, implied/inferred prices
- If zero valid offers exist → both values MUST be "null"
- HIGHEST OFFER = the maximum valid offer found
- BEST OFFER = most favorable offer (weighing price + buyer seriousness + urgency) — can differ from highest
- INVARIANT: Highest Offer value >= Best Offer value. If violated, you have an error — fix before returning.

RED FLAG PRIORITY: If any buyer shows suspicious behavior (lowball patterns, ghosting after price reveal, requesting account/personal info, fake urgency, scam signals) — this MUST be highlighted in the description regardless of offer size.

OUTPUT: Return ONLY this JSON, nothing else:
{
  "summary": [
    {
      "title": "Highest Offer",
      "value": "<numeric string or null>",
      "description": "<1–2 sentences, second person, highlights red flags if any>"
    },
    {
      "title": "Best Offer",
      "value": "<numeric string or null>",
      "description": "<1–2 sentences, second person, highlights red flags if any>"
    }
  ]
}

Rules: value = raw number only (e.g. "40000"), no ₹ symbol, no commas, no markdown, no extra text.`;

  const userPrompt = `Analyze the main ad and its chat data against the related ads below.

MAIN AD:
${JSON.stringify(mainAdData, null, 2)}

RELATED ADS:
${JSON.stringify(relatedAdsData, null, 2)}

Steps:
1. Scan ALL chat messages. Extract only explicit buyer price offers.
2. Identify Highest Offer (max value) and Best Offer (best overall considering seriousness + urgency).
3. Verify: Highest Offer >= Best Offer. If not, re-analyze.
4. Check for red flags in buyer behavior — flag in description if found.
5. Return ONLY the JSON. No explanation, no markdown.`;

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
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.1, // lower = more deterministic
        max_tokens: 600
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Groq API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No valid JSON in AI response');

    const parsed = JSON.parse(jsonMatch[0]);

    // Post-processing safety check: enforce Highest >= Best
    const summary = parsed?.summary ?? [];
    const highest = summary.find(s => s.title === "Highest Offer");
    const best = summary.find(s => s.title === "Best Offer");

    if (highest && best && highest.value !== "null" && best.value !== "null") {
      if (Number(best.value) > Number(highest.value)) {
        // Swap the values if model got it backwards
        [highest.value, best.value] = [best.value, highest.value];
      }
    }

    return parsed;
  } catch (error) {
    console.error('Groq API Error:', error);
    throw error;
  }
}