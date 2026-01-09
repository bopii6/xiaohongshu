/**
 * xiaohongshu-mcp HTTP Client
 * 
 * This client integrates with the xiaohongshu-mcp service for stable,
 * anti-detection publishing to Xiaohongshu platform.
 * 
 * xiaohongshu-mcp: https://github.com/xpzouying/xiaohongshu-mcp
 * - Uses go-rod/stealth for anti-detection
 * - Auto cookie persistence
 * - 1 year no ban track record
 */

const MCP_BASE_URL = process.env.XHS_MCP_URL || 'http://localhost:18060';
const MCP_TIMEOUT = parseInt(process.env.XHS_MCP_TIMEOUT || '120000', 10);

export interface PublishParams {
    title: string;
    content: string;
    images?: string[];
    video?: string;
}

export interface PublishResult {
    success: boolean;
    message?: string;
    error?: string;
    data?: Record<string, unknown>;
}

export interface LoginStatus {
    logged_in: boolean;
    message?: string;
}

export interface SearchResult {
    success: boolean;
    feeds?: Array<{
        id: string;
        title: string;
        xsec_token: string;
        desc?: string;
        liked_count?: number;
        collected_count?: number;
    }>;
    error?: string;
}

/**
 * Check if xiaohongshu-mcp service is running
 */
export async function checkServiceHealth(): Promise<boolean> {
    try {
        const response = await fetch(`${MCP_BASE_URL}/health`, {
            method: 'GET',
            signal: AbortSignal.timeout(5000),
        });
        return response.ok;
    } catch {
        return false;
    }
}

/**
 * Check login status
 */
export async function checkLoginStatus(): Promise<LoginStatus> {
    try {
        const response = await fetch(`${MCP_BASE_URL}/api/check_login_status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(30000),
        });

        if (!response.ok) {
            return { logged_in: false, message: `HTTP ${response.status}` };
        }

        const data = await response.json();
        return {
            logged_in: data.logged_in ?? data.success ?? false,
            message: data.message,
        };
    } catch (error) {
        return {
            logged_in: false,
            message: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Publish image/text content to Xiaohongshu
 */
export async function publishContent(params: PublishParams): Promise<PublishResult> {
    try {
        // Validate
        if (!params.title?.trim()) {
            return { success: false, error: '标题不能为空' };
        }
        if (!params.content?.trim()) {
            return { success: false, error: '内容不能为空' };
        }
        if (!params.images?.length && !params.video) {
            return { success: false, error: '至少需要一张图片或视频' };
        }

        const response = await fetch(`${MCP_BASE_URL}/api/publish_content`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: params.title.trim().slice(0, 20), // XHS limit: 20 chars
                content: params.content.trim().slice(0, 1000), // XHS limit: 1000 chars
                images: params.images || [],
            }),
            signal: AbortSignal.timeout(MCP_TIMEOUT),
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                error: data.error || data.message || `HTTP ${response.status}`,
            };
        }

        return {
            success: data.success ?? true,
            message: data.message || '发布成功',
            data,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : '发布失败，请检查 MCP 服务状态',
        };
    }
}

/**
 * Publish video content to Xiaohongshu
 */
export async function publishVideo(params: PublishParams): Promise<PublishResult> {
    try {
        if (!params.video) {
            return { success: false, error: '视频路径不能为空' };
        }

        const response = await fetch(`${MCP_BASE_URL}/api/publish_with_video`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: params.title.trim().slice(0, 20),
                content: params.content.trim().slice(0, 1000),
                video: params.video,
            }),
            signal: AbortSignal.timeout(MCP_TIMEOUT * 2), // Video takes longer
        });

        const data = await response.json();

        return {
            success: data.success ?? response.ok,
            message: data.message,
            error: data.error,
            data,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : '视频发布失败',
        };
    }
}

/**
 * Search content on Xiaohongshu
 */
export async function searchFeeds(keyword: string): Promise<SearchResult> {
    try {
        const response = await fetch(`${MCP_BASE_URL}/api/search_feeds`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ keyword }),
            signal: AbortSignal.timeout(30000),
        });

        const data = await response.json();

        return {
            success: response.ok && !data.error,
            feeds: data.feeds || data.data?.feeds || [],
            error: data.error,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : '搜索失败',
        };
    }
}

/**
 * Get homepage feed list
 */
export async function listFeeds(): Promise<SearchResult> {
    try {
        const response = await fetch(`${MCP_BASE_URL}/api/list_feeds`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(30000),
        });

        const data = await response.json();

        return {
            success: response.ok && !data.error,
            feeds: data.feeds || data.data?.feeds || [],
            error: data.error,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : '获取推荐列表失败',
        };
    }
}
