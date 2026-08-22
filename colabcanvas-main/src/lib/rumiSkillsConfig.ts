import { LayoutGrid, FileText, Instagram, Package, BookOpen, Megaphone, Smartphone, LucideIcon } from 'lucide-react';

export interface SkillStep {
  id: string;
  title: string;
  description: string;
  type: 'collect' | 'analyze' | 'generate' | 'refine';
}

export interface SkillField {
  key: string;
  label: string;
  placeholder: string;
  required: boolean;
}

export interface Skill {
  id: string;
  name: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  description: string;
  executionPlan: {
    title: string;
    steps: SkillStep[];
  };
  requiredFields: SkillField[];
  designType: string;
  requestType: string;
  iterationCount: number;
}

export const RUMI_SKILLS: Skill[] = [
  {
    id: 'logo-brand',
    name: 'Logo & Brand Design',
    icon: LayoutGrid,
    color: 'text-orange-500',
    bgColor: 'bg-orange-50',
    description: 'Professional logos with brand identity',
    executionPlan: {
      title: 'Logo Design Workflow',
      steps: [
        { id: 'brief', title: 'Brief Analysis', description: 'Understanding brand requirements', type: 'analyze' },
        { id: 'research', title: 'Style Research', description: 'Finding relevant design references', type: 'analyze' },
        { id: 'concepts', title: 'Concept Generation', description: 'Creating 5 distinct logo concepts', type: 'generate' },
        { id: 'refinement', title: 'Design Refinement', description: 'Polishing selected concepts', type: 'refine' },
        { id: 'delivery', title: 'Final Delivery', description: 'Preparing variations and formats', type: 'generate' }
      ]
    },
    requiredFields: [
      { key: 'brandName', label: 'Brand Name', placeholder: 'e.g., Cobano', required: true },
      { key: 'industry', label: 'Industry', placeholder: 'e.g., Cafe, Tech, Fashion', required: true }
    ],
    designType: 'logo',
    requestType: 'logo_only',
    iterationCount: 5
  },
  {
    id: 'marketing-brochures',
    name: 'Marketing Brochures',
    icon: FileText,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
    description: 'Professional marketing materials',
    executionPlan: {
      title: 'Brochure Design Workflow',
      steps: [
        { id: 'content', title: 'Content Analysis', description: 'Structuring key messages', type: 'analyze' },
        { id: 'layout', title: 'Layout Planning', description: 'Creating visual hierarchy', type: 'analyze' },
        { id: 'design', title: 'Design Generation', description: 'Producing brochure layouts', type: 'generate' },
        { id: 'polish', title: 'Visual Polish', description: 'Adding final touches', type: 'refine' }
      ]
    },
    requiredFields: [
      { key: 'brandName', label: 'Brand/Product', placeholder: 'e.g., Product launch', required: true },
      { key: 'purpose', label: 'Purpose', placeholder: 'e.g., Sales, Awareness', required: true }
    ],
    designType: 'poster',
    requestType: 'poster',
    iterationCount: 4
  },
  {
    id: 'social-media',
    name: 'Social Media Visual Assets',
    icon: Instagram,
    color: 'text-pink-500',
    bgColor: 'bg-pink-50',
    description: 'Instagram, Facebook, LinkedIn visuals',
    executionPlan: {
      title: 'Social Media Asset Workflow',
      steps: [
        { id: 'platform', title: 'Platform Analysis', description: 'Optimizing for target platforms', type: 'analyze' },
        { id: 'template', title: 'Template Design', description: 'Creating reusable layouts', type: 'generate' },
        { id: 'variations', title: 'Content Variations', description: 'Generating multiple formats', type: 'generate' },
        { id: 'optimization', title: 'Final Optimization', description: 'Ensuring platform compliance', type: 'refine' }
      ]
    },
    requiredFields: [
      { key: 'brandName', label: 'Brand Name', placeholder: 'e.g., Your Brand', required: true },
      { key: 'platform', label: 'Platform', placeholder: 'e.g., Instagram, LinkedIn', required: true }
    ],
    designType: 'campaign',
    requestType: 'campaign',
    iterationCount: 5
  },
  {
    id: 'amazon-listing',
    name: 'Amazon Product Listing Kit',
    icon: Package,
    color: 'text-amber-500',
    bgColor: 'bg-amber-50',
    description: 'Complete Amazon listing visuals',
    executionPlan: {
      title: 'Amazon Listing Workflow',
      steps: [
        { id: 'product', title: 'Product Analysis', description: 'Understanding product features', type: 'analyze' },
        { id: 'hero', title: 'Hero Image Creation', description: 'Main product showcase image', type: 'generate' },
        { id: 'infographics', title: 'Infographic Design', description: 'Feature highlight images', type: 'generate' },
        { id: 'lifestyle', title: 'Lifestyle Shots', description: 'Usage context images', type: 'generate' },
        { id: 'compliance', title: 'Amazon Compliance', description: 'Ensuring guideline adherence', type: 'refine' }
      ]
    },
    requiredFields: [
      { key: 'productName', label: 'Product Name', placeholder: 'e.g., Wireless Earbuds', required: true },
      { key: 'category', label: 'Category', placeholder: 'e.g., Electronics, Home', required: true }
    ],
    designType: 'ecommerce',
    requestType: 'ecommerce',
    iterationCount: 6
  },
  {
    id: 'storyboards',
    name: 'Narrative Storyboards',
    icon: BookOpen,
    color: 'text-green-500',
    bgColor: 'bg-green-50',
    description: 'Visual storytelling sequences',
    executionPlan: {
      title: 'Storyboard Workflow',
      steps: [
        { id: 'narrative', title: 'Narrative Analysis', description: 'Breaking down the story', type: 'analyze' },
        { id: 'scenes', title: 'Scene Planning', description: 'Mapping key moments', type: 'analyze' },
        { id: 'illustration', title: 'Scene Illustration', description: 'Creating each frame', type: 'generate' },
        { id: 'sequence', title: 'Sequence Polish', description: 'Ensuring visual flow', type: 'refine' }
      ]
    },
    requiredFields: [
      { key: 'storyTitle', label: 'Story Title', placeholder: 'e.g., Product Journey', required: true },
      { key: 'frames', label: 'Number of Frames', placeholder: 'e.g., 4-6 frames', required: false }
    ],
    designType: 'illustration',
    requestType: 'illustration',
    iterationCount: 5
  },
  {
    id: 'ad-campaigns',
    name: 'Ad Campaigns',
    icon: Megaphone,
    color: 'text-purple-500',
    bgColor: 'bg-purple-50',
    description: 'Facebook, Google, LinkedIn ad creatives',
    executionPlan: {
      title: 'Ad Campaign Workflow',
      steps: [
        { id: 'objective', title: 'Campaign Objective', description: 'Defining campaign goals', type: 'analyze' },
        { id: 'audience', title: 'Audience Analysis', description: 'Understanding target audience', type: 'analyze' },
        { id: 'creatives', title: 'Creative Generation', description: 'Producing ad variations', type: 'generate' },
        { id: 'optimization', title: 'Ad Optimization', description: 'Platform-specific adjustments', type: 'refine' }
      ]
    },
    requiredFields: [
      { key: 'brandName', label: 'Brand Name', placeholder: 'e.g., Your Brand', required: true },
      { key: 'platform', label: 'Ad Platform', placeholder: 'e.g., Facebook, Google', required: true }
    ],
    designType: 'campaign',
    requestType: 'campaign',
    iterationCount: 5
  },
  {
    id: 'app-screenshots',
    name: 'App Store Screenshots',
    icon: Smartphone,
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-50',
    description: 'iOS and Android app store visuals',
    executionPlan: {
      title: 'App Screenshot Workflow',
      steps: [
        { id: 'features', title: 'Feature Mapping', description: 'Highlighting key app features', type: 'analyze' },
        { id: 'mockups', title: 'Device Mockups', description: 'Creating device frames', type: 'generate' },
        { id: 'captions', title: 'Caption Design', description: 'Adding compelling text overlays', type: 'generate' },
        { id: 'polish', title: 'Final Polish', description: 'Ensuring store compliance', type: 'refine' }
      ]
    },
    requiredFields: [
      { key: 'appName', label: 'App Name', placeholder: 'e.g., MyApp', required: true },
      { key: 'platform', label: 'App Store', placeholder: 'e.g., iOS, Android, Both', required: true }
    ],
    designType: 'app_poster',
    requestType: 'app_poster',
    iterationCount: 5
  }
];

// Helper to analyze prompt completeness
export interface PromptAnalysis {
  isComplete: boolean;
  designType: string | null;
  extractedFields: Record<string, string>;
  wordCount: number;
  completenessScore: number;
}

export const analyzePromptCompleteness = (prompt: string): PromptAnalysis => {
  const wordCount = prompt.trim().split(/\s+/).filter(Boolean).length;
  
  // Design type detection
  const designTypePatterns: Array<{ pattern: RegExp; type: string }> = [
    { pattern: /\b(logo|brand|branding|identity)\b/i, type: 'logo' },
    { pattern: /\b(poster|flyer|banner)\b/i, type: 'poster' },
    { pattern: /\b(campaign|marketing|social media|instagram|facebook|linkedin)\b/i, type: 'campaign' },
    { pattern: /\b(illustration|artwork|art)\b/i, type: 'illustration' },
    { pattern: /\b(character|mascot|avatar)\b/i, type: 'character' },
    { pattern: /\b(brochure|pamphlet|catalog)\b/i, type: 'poster' },
    { pattern: /\b(amazon|product listing|ecommerce)\b/i, type: 'ecommerce' },
    { pattern: /\b(storyboard|story board|sequence)\b/i, type: 'illustration' },
  ];
  
  let detectedType: string | null = null;
  for (const { pattern, type } of designTypePatterns) {
    if (pattern.test(prompt)) {
      detectedType = type;
      break;
    }
  }
  
  const extractedFields: Record<string, string> = {};
  
  // Brand name detection patterns
  const brandPatterns = [
    /(?:for|called|named|brand)\s+["']?([A-Z][a-zA-Z0-9\s]{1,30}?)["']?(?:\s|,|\.|\b)/i,
    /["']([A-Z][a-zA-Z0-9\s]{1,30}?)["']\s+(?:logo|brand|design|branding)/i,
    /(?:brand|company|business)\s+(?:is\s+)?["']?([A-Z][a-zA-Z0-9\s]{1,30}?)["']?/i,
  ];
  
  for (const pattern of brandPatterns) {
    const match = prompt.match(pattern);
    if (match) {
      extractedFields.brandName = match[1].trim();
      break;
    }
  }
  
  // Industry detection
  const industries = [
    'cafe', 'coffee', 'tech', 'technology', 'software', 'fashion', 'healthcare', 
    'medical', 'finance', 'banking', 'food', 'restaurant', 'retail', 'ecommerce',
    'e-commerce', 'beauty', 'cosmetics', 'fitness', 'gym', 'education', 'travel',
    'hospitality', 'hotel', 'real estate', 'automotive', 'gaming', 'entertainment',
    'music', 'media', 'consulting', 'legal', 'law', 'architecture', 'construction'
  ];
  
  const detectedIndustry = industries.find(i => prompt.toLowerCase().includes(i));
  if (detectedIndustry) extractedFields.industry = detectedIndustry;
  
  // Style keywords detection
  const styleKeywords = [
    'minimal', 'minimalist', 'bold', 'playful', 'modern', 'vintage', 'retro',
    'luxury', 'elegant', 'geometric', 'organic', 'vibrant', 'muted', 'professional',
    'clean', 'sleek', 'fun', 'serious', 'corporate', 'casual', 'premium',
    'sophisticated', 'youthful', 'mature', 'edgy', 'classic', 'contemporary'
  ];
  
  const detectedStyles = styleKeywords.filter(s => prompt.toLowerCase().includes(s));
  if (detectedStyles.length > 0) {
    extractedFields.styleKeywords = detectedStyles.join(', ');
  }
  
  // Audience detection
  const audiencePatterns = [
    /(?:targeting|for|audience|customers?)\s+([a-z\s]{5,50}?)(?:\.|,|$)/i,
    /(?:gen\s*z|millennials?|young\s+(?:adults?|professionals?)|seniors?|teens?|professionals?)/i,
  ];
  
  for (const pattern of audiencePatterns) {
    const match = prompt.match(pattern);
    if (match) {
      extractedFields.audience = match[1] || match[0];
      break;
    }
  }
  
  // Calculate completeness score
  const requiredFields = ['brandName', 'industry'];
  const presentFields = requiredFields.filter(f => extractedFields[f]);
  const completenessScore = (presentFields.length / requiredFields.length) * 100;
  
  // Comprehensive if:
  // - 500+ words (detailed brief)
  // - OR has brand name + industry + design type
  // - OR has 100+ words with design type + brand name
  const isComplete = 
    wordCount >= 500 || 
    Boolean(detectedType && extractedFields.brandName && extractedFields.industry) ||
    Boolean(wordCount >= 100 && detectedType && extractedFields.brandName);
  
  return { 
    isComplete: Boolean(isComplete),
    designType: detectedType, 
    extractedFields, 
    wordCount,
    completenessScore 
  };
};
