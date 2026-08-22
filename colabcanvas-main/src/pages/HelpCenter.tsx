import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Search } from "lucide-react";
import { SupportChat } from "@/components/support/SupportChat";
import { TicketsList } from "@/components/support/TicketsList";
import { supabase } from "@/integrations/supabase/client";

const HelpCenter = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    getUser();
  }, []);

  const helpArticles = [
    {
      category: "Getting Started",
      articles: [
        {
          title: "How do I create my first project?",
          content: "To create a new project, go to your Dashboard and click the '+ New Project' button. Choose your desired canvas size and start designing!"
        },
        {
          title: "How do I navigate the interface?",
          content: "The main workspace consists of the canvas in the center, toolbar on the left, properties panel on the right, and layers panel for managing your design elements."
        },
        {
          title: "What are the system requirements?",
          content: "You need a modern web browser (Chrome, Firefox, Safari, or Edge) with an active internet connection. We recommend at least 4GB of RAM for optimal performance."
        }
      ]
    },
    {
      category: "Canvas & Design Tools",
      articles: [
        {
          title: "How do I use the selection tool?",
          content: "Click the selection tool (pointer icon) in the toolbar, then click any object on the canvas to select it. You can move, resize, or modify selected objects."
        },
        {
          title: "How do I add images to my design?",
          content: "Click the image tool in the toolbar and either upload an image from your computer or paste an image URL. You can then position and resize the image on your canvas."
        },
        {
          title: "What are artboards?",
          content: "Artboards are containers for your designs. They help organize multiple design variations or pages within a single project. You can create, resize, and arrange multiple artboards."
        },
        {
          title: "How do I use layers?",
          content: "The Layers panel shows all objects in your design. You can reorder layers by dragging, toggle visibility, lock layers, and organize your design hierarchy."
        }
      ]
    },
    {
      category: "AI Features",
      articles: [
        {
          title: "How does the AI chat work?",
          content: "The AI chat helps you design by understanding natural language instructions. Describe what you want to create or modify, and the AI will help generate or adjust your designs."
        },
        {
          title: "How do I generate images with AI?",
          content: "Use the AI chat to describe the image you want. For example, 'Create a modern logo for a coffee shop' or 'Generate a sunset landscape background'."
        },
        {
          title: "What models are available?",
          content: "We offer multiple AI models including GPT-5, GPT-5-mini, Gemini 2.5 Pro, and Gemini Flash. Each model has different strengths for various design tasks."
        },
        {
          title: "How do I write effective prompts?",
          content: "Be specific and descriptive. Include details about style, colors, mood, and composition. For example: 'Create a minimalist blue and white logo with geometric shapes for a tech startup'."
        }
      ]
    },
    {
      category: "Billing & Subscriptions",
      articles: [
        {
          title: "What subscription plans are available?",
          content: "We offer Free, Professional, Business, and Enterprise plans. Each plan includes different credit allocations and features. Visit the Pricing page for detailed information."
        },
        {
          title: "How do credits work?",
          content: "Credits are used for AI-powered features like image generation and AI chat. Each action consumes a certain number of credits. Your plan determines your monthly credit allocation."
        },
        {
          title: "Can I upgrade or downgrade my plan?",
          content: "Yes! You can change your subscription plan anytime from your Account Settings. Changes take effect at the start of your next billing cycle."
        },
        {
          title: "What payment methods do you accept?",
          content: "We accept major credit cards, debit cards, and UPI payments through our secure payment gateway."
        }
      ]
    },
    {
      category: "Account Management",
      articles: [
        {
          title: "How do I update my profile?",
          content: "Go to Settings from the profile dropdown menu. You can update your name, email, avatar, and other profile information."
        },
        {
          title: "How do I change my password?",
          content: "Visit Settings > Security to change your password. You'll need to enter your current password and then your new password."
        },
        {
          title: "How do I export my designs?",
          content: "Click the Download button in the canvas toolbar. You can export your designs as PNG, JPG, or SVG files in various resolutions."
        },
        {
          title: "Is my data secure?",
          content: "Yes! We use industry-standard encryption and security practices. Your designs are stored securely and are only accessible to you."
        }
      ]
    },
    {
      category: "Troubleshooting",
      articles: [
        {
          title: "My design isn't saving. What should I do?",
          content: "Check your internet connection. Your designs auto-save when connected. If issues persist, try refreshing the page. Your work is cached locally."
        },
        {
          title: "The canvas is running slow. How can I fix this?",
          content: "Try reducing the number of layers, simplifying complex shapes, or closing other browser tabs. Ensure you're using the latest browser version."
        },
        {
          title: "I can't upload images. What's wrong?",
          content: "Check that your image file is in a supported format (JPG, PNG, SVG, WebP) and under 10MB. Try a different browser if the issue persists."
        },
        {
          title: "How do I report a bug?",
          content: "Use the 'Report a Bug' option in the profile dropdown menu. Provide details about the issue, steps to reproduce it, and any error messages you see."
        }
      ]
    }
  ];

  const filteredArticles = helpArticles.map(category => ({
    ...category,
    articles: category.articles.filter(article =>
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.content.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.articles.length > 0);

  return (
    <div className="min-h-screen bg-zinc-100">
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-zinc-900">Help Center</h1>
          <p className="text-zinc-600">
            Find answers to common questions and get AI-powered support
          </p>
        </div>

        <Tabs defaultValue="help" className="space-y-6">
          <TabsList className="bg-transparent border-none p-0 gap-2">
            <TabsTrigger value="help" className="data-[state=active]:bg-zinc-900 data-[state=active]:text-white data-[state=inactive]:bg-zinc-200 data-[state=inactive]:text-zinc-700 rounded-lg px-4 py-2">
              Help Articles
            </TabsTrigger>
            <TabsTrigger value="tickets" className="data-[state=active]:bg-zinc-900 data-[state=active]:text-white data-[state=inactive]:bg-zinc-200 data-[state=inactive]:text-zinc-700 rounded-lg px-4 py-2">
              My Tickets
            </TabsTrigger>
          </TabsList>

          <TabsContent value="help" className="space-y-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input
                type="text"
                placeholder="Search help articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white border-zinc-300 text-zinc-900 placeholder:text-zinc-400"
              />
            </div>

            {filteredArticles.length > 0 ? (
              <div className="space-y-8">
                {filteredArticles.map((category) => (
                  <div key={category.category}>
                    <h2 className="text-2xl font-semibold mb-4 text-zinc-900">{category.category}</h2>
                    <Accordion type="single" collapsible className="w-full">
                      {category.articles.map((article, index) => (
                        <AccordionItem 
                          key={index} 
                          value={`${category.category}-${index}`}
                          className="border-zinc-300"
                        >
                          <AccordionTrigger className="text-zinc-700 hover:text-zinc-900">
                            {article.title}
                          </AccordionTrigger>
                          <AccordionContent>
                            <p className="text-zinc-600">{article.content}</p>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-zinc-600">No articles found matching your search.</p>
              </div>
            )}

            <div className="mt-12 p-6 bg-zinc-200 border border-zinc-300 rounded-lg">
              <h3 className="text-lg font-semibold mb-2 text-zinc-900">Still need help?</h3>
              <p className="text-zinc-600 mb-4">
                If you couldn't find what you're looking for, use the AI chat or visit our community.
              </p>
              <div className="flex gap-4">
                <Button 
                  onClick={() => navigate("/feedback")}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white"
                >
                  Contact Support
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => window.open("https://discord.gg/hj5vSAkv", "_blank")}
                  className="border-zinc-400 text-zinc-700 hover:bg-zinc-300 hover:text-zinc-900"
                >
                  Join Community
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="tickets">
            {userId ? (
              <TicketsList userId={userId} />
            ) : (
              <div className="text-center py-12">
                <p className="text-zinc-600">Please sign in to view your tickets.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        {userId && <SupportChat userId={userId} />}
      </div>
    </div>
  );
};

export default HelpCenter;
