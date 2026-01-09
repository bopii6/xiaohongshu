/**
 * 小红书敏感词库
 * 分类：广告法违规词、医疗违规词、平台限流词、绝对化用语等
 */

// 绝对化用语（广告法禁用）
export const absoluteWords = [
    '最好', '最佳', '最优', '最强', '最高', '最低', '最便宜', '最贵',
    '第一', '首个', '首选', '唯一', '顶级', '顶尖', '极品', '极致',
    '绝对', '绝无仅有', '独一无二', '无与伦比', '无可比拟',
    '万能', '全能', '神器', '神级', '百分百', '100%',
    '永久', '永远', '终身', '一辈子',
    '国家级', '世界级', '宇宙级', '全球第一', '全国第一',
    '最高级', '最低级', '最先进', '最传统',
    '史上最', '全网最', '行业第一', '领导品牌',
    '驰名', '著名', '老字号', '祖传', '特供', '专供',
    '抄底', '冰点价', '史无前例', '前所未有'
];

// 医疗健康类违规词
export const medicalWords = [
    '治疗', '治愈', '根治', '药效', '疗效', '药到病除',
    '抗癌', '防癌', '抗肿瘤', '消炎', '杀菌', '消毒',
    '降血压', '降血糖', '降血脂', '减肥药', '瘦身药',
    '壮阳', '补肾', '增高', '丰胸', '脱毛',
    '医学', '临床', '处方', '基因', '干细胞',
    '无副作用', '纯天然', '纯中药', '祖传秘方',
    '包治', '包好', '立竿见影', '药到病除', '三天见效'
];

// 诱导类词汇
export const inductiveWords = [
    '点击领取', '免费领', '扫码领取', '点击关注',
    '求关注', '求点赞', '求收藏', '求转发',
    '不看后悔', '必看', '必买', '必收藏', '必须买',
    '错过再无', '限时', '限量', '抢购', '秒杀',
    '最后一天', '仅剩', '即将售罄', '数量有限'
];

// 虚假宣传词
export const falseClaimWords = [
    '假一赔十', '假一罚万', '正品保证', '专柜正品',
    '明星同款', '网红同款', '代购', '海外直邮',
    '特效', '神效', '奇效', '速效', '立效',
    '一用就', '一抹就', '一喷就', '一涂就'
];

// 敏感人群/话题词
export const sensitiveTopic = [
    '政治', '政府', '领导', '国家机密',
    '赌博', '博彩', '彩票内幕',
    '色情', '暴力', '血腥',
    '毒品', '违禁药', '处方药'
];

// 平台限流词（小红书特有）
export const platformRestrictedWords = [
    '微信', 'wx', 'vx', 'V信', '威信',
    '淘宝', 'tb', '天猫',
    '拼多多', 'pdd',
    '抖音', 'dy', '快手', 'ks',
    '私聊', '私信我', '私我',
    '加我', '找我', '联系我',
    '导流', '引流', '转化',
    '赚钱', '躺赚', '日入', '月入',
    '代理', '招代理', '招商'
];

// 所有敏感词集合
export const allSensitiveWords = [
    ...absoluteWords,
    ...medicalWords,
    ...inductiveWords,
    ...falseClaimWords,
    ...sensitiveTopic,
    ...platformRestrictedWords
];

// 敏感词分类
export const sensitiveCategories = {
    absolute: { name: '绝对化用语', level: 'high', words: absoluteWords },
    medical: { name: '医疗违规词', level: 'high', words: medicalWords },
    inductive: { name: '诱导类词汇', level: 'medium', words: inductiveWords },
    falseClaim: { name: '虚假宣传', level: 'high', words: falseClaimWords },
    sensitiveTopic: { name: '敏感话题', level: 'critical', words: sensitiveTopic },
    platformRestricted: { name: '平台限流词', level: 'medium', words: platformRestrictedWords }
};

export type SensitiveCategory = keyof typeof sensitiveCategories;
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface DetectedWord {
    word: string;
    category: SensitiveCategory;
    categoryName: string;
    level: RiskLevel;
    suggestion?: string;
}

/**
 * 检测文本中的敏感词
 */
export function detectSensitiveWords(text: string): DetectedWord[] {
    const detected: DetectedWord[] = [];
    const lowerText = text.toLowerCase();

    for (const [category, config] of Object.entries(sensitiveCategories)) {
        for (const word of config.words) {
            const lowerWord = word.toLowerCase();
            if (lowerText.includes(lowerWord)) {
                // Check if not already detected
                if (!detected.find(d => d.word === word)) {
                    detected.push({
                        word,
                        category: category as SensitiveCategory,
                        categoryName: config.name,
                        level: config.level as RiskLevel,
                        suggestion: getSuggestion(word, category as SensitiveCategory)
                    });
                }
            }
        }
    }

    return detected;
}

/**
 * 获取替换建议
 */
function getSuggestion(word: string, category: SensitiveCategory): string {
    const suggestions: Record<string, Record<string, string>> = {
        absolute: {
            '最好': '非常好/很不错',
            '最佳': '很棒的/推荐的',
            '第一': '领先的/优秀的',
            '唯一': '难得的/少见的',
            '顶级': '高端的/优质的',
            '万能': '多功能的/实用的',
            '神器': '好物/必备款',
            '百分百': '大概率/很可能'
        },
        medical: {
            '治疗': '改善/缓解',
            '治愈': '好转/恢复',
            '药效': '效果/作用',
            '消炎': '舒缓/镇定',
            '减肥': '塑形/管理体重'
        },
        platformRestricted: {
            '微信': '小窗/评论区',
            '淘宝': '某宝/电商平台',
            '私聊': '评论区聊/小窗'
        }
    };

    return suggestions[category]?.[word] || '建议删除或替换';
}

/**
 * 计算整体风险等级
 */
export function calculateRiskLevel(detected: DetectedWord[]): RiskLevel {
    if (detected.length === 0) return 'low';

    const hasCritical = detected.some(d => d.level === 'critical');
    if (hasCritical) return 'critical';

    const highCount = detected.filter(d => d.level === 'high').length;
    if (highCount >= 3) return 'critical';
    if (highCount >= 1) return 'high';

    const mediumCount = detected.filter(d => d.level === 'medium').length;
    if (mediumCount >= 3) return 'high';
    if (mediumCount >= 1) return 'medium';

    return 'low';
}
