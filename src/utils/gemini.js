import { GoogleGenerativeAI } from "@google/generative-ai";

export async function getGeminiRecommendation(userData, db) {
  // Use Vite environment variable, if missing we will just return an error inside try/catch.
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Gemini API 키가 설정되지 않았습니다. .env 파일에 VITE_GEMINI_API_KEY를 설정해주세요."
    );
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Equivalent to gemini-1.5-flash with JSON mode
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const prompt = `
당신은 선수의 고민을 분석하여 최적의 스포츠 심리 상담사를 추천하는 AI 전문가입니다.

### 상담사 데이터베이스 (JSON):
${JSON.stringify(db, null, 2)}

### 상담을 요청한 선수 정보:
- **소속 운동 종목:** ${userData.sport}
- **주요 고민 분야:** ${userData.areas_of_concern.join(", ")}
- **선호 상담 지역/방식:** ${userData.preferred_location.join(", ")}
- **선호 상담사 성별:** ${userData.preferred_gender}
- **선호 상담사 전문성 수준:** ${userData.preferred_experience_level}

### 지시사항:
1. 선수의 '주요 고민 분야'를 깊이 분석하여 데이터베이스에서 **가장 적합한 상담사 한 명**을 선택하세요.
2. 반드시 아래의 JSON 스키마 형식으로만 응답하세요. (Markdown 코드 블록 없이 순수 JSON만 반환)

{
  "recommendation_text": "추천 이유와 기대효과를 포함한 Markdown 형식의 텍스트",
  "booking_link": "선택된 상담사의 booking_link URL"
}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Parse the JSON. (Since it's generating JSON due to responseMimeType, it should be clean)
    return JSON.parse(text);
  } catch (error) {
    console.error("AI 응답 처리 오류:", error);
    throw new Error("AI 응답을 처리하는 중 오류가 발생했습니다.");
  }
}
