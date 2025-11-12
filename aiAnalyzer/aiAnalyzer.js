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

    // // Extract JSON from response
    // const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    // if (!jsonMatch) {
    //   throw new Error('No valid JSON in AI response');
    // }

    // const parsedData = JSON.parse(jsonMatch[0]);
    // Step 1: Clean the string
let cleaned = aiResponse.replace(/\n/g, '').replace(/\\"/g, '"');

// Step 2: Parse to JSON
let validJSON = JSON.parse(cleaned);

    return validJSON;

  } catch (error) {
    console.error('Groq API Error:', error);
    throw error;
  }
}