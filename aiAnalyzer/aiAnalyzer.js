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
