import axios from 'axios';

export interface ApiResponse {
  responseCode: string;
  responseMessage: string;
  data?: any;
}

/**
 * 发送POST请求
 */
export async function sendPostRequest(
    url: string,
    jsonBody: string,
    authCode: string
): Promise<ApiResponse> {
  try {
    const response = await axios.post(url, jsonBody, {
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        'Authorization': authCode,
      },
      timeout: 30000,
    });

    return response.data as ApiResponse;
  } catch (error: any) {
    console.error('HTTP请求失败:', error.message);
    if (error.response) {
      console.error('HTTP状态码:', error.response.status);
      console.error('响应数据:', JSON.stringify(error.response.data));
    }
    // 将响应详情包含在错误信息中
    const detail = error.response?.data 
      ? (typeof error.response.data === 'string' ? error.response.data : JSON.stringify(error.response.data))
      : '';
    throw new Error(`HTTP请求失败 [${error.response?.status || 'N/A'}]: ${error.message}${detail ? ' - ' + detail : ''}`);
  }
}