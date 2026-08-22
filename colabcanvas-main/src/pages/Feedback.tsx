import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";
const feedbackSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(200, "Title must be less than 200 characters"),
  description: z.string().min(10, "Description must be at least 10 characters").max(2000, "Description must be less than 2000 characters"),
  email: z.string().email("Invalid email address").max(255, "Email must be less than 255 characters")
});
type FeedbackFormData = z.infer<typeof feedbackSchema>;
const Feedback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    toast
  } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [activeTab, setActiveTab] = useState("bug");
  const form = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      title: "",
      description: "",
      email: ""
    }
  });
  useEffect(() => {
    const fetchUserEmail = async () => {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
        form.setValue("email", user.email);
      }
    };
    fetchUserEmail();
    const tab = searchParams.get("tab");
    if (tab === "improvement" || tab === "bug") {
      setActiveTab(tab);
    }
  }, [searchParams, form]);
  const getBrowserInfo = () => {
    return {
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      platform: navigator.platform,
      language: navigator.language
    };
  };
  const onSubmit = async (data: FeedbackFormData) => {
    setIsSubmitting(true);
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to submit feedback.",
          variant: "destructive"
        });
        navigate("/auth");
        return;
      }
      const {
        error
      } = await supabase.from("feedback").insert({
        user_id: user.id,
        type: activeTab === "bug" ? "bug" : "improvement",
        title: data.title,
        description: data.description,
        email: data.email,
        browser_info: getBrowserInfo()
      });
      if (error) throw error;
      toast({
        title: "Feedback submitted successfully!",
        description: "Thank you for helping us improve. We'll review your feedback shortly."
      });
      form.reset();
      form.setValue("email", userEmail);
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast({
        title: "Failed to submit feedback",
        description: "Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  return <div className="min-h-screen bg-zinc-50">
      <div className="container max-w-xl mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">We'd Love Your Feedback</h1>
          <p className="text-muted-foreground">
            Help us improve by reporting bugs or suggesting new features
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="inline-flex w-auto mx-auto bg-transparent">
            <TabsTrigger value="bug" className="data-[state=active]:bg-zinc-900 data-[state=active]:text-white data-[state=inactive]:bg-zinc-200 data-[state=inactive]:text-zinc-700">Report a Bug</TabsTrigger>
            <TabsTrigger value="improvement" className="data-[state=active]:bg-zinc-900 data-[state=active]:text-white data-[state=inactive]:bg-zinc-200 data-[state=inactive]:text-zinc-700">Suggest Improvement</TabsTrigger>
          </TabsList>

          <TabsContent value="bug" className="mt-6">
            <div className="bg-card p-6 rounded-lg border">
              <h2 className="text-xl font-semibold mb-4">Report a Bug</h2>
              <p className="text-muted-foreground mb-6">
                Found something that's not working as expected? Let us know so we can fix it.
              </p>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField control={form.control} name="title" render={({
                  field
                }) => <FormItem>
                        <FormLabel>Bug Title *</FormLabel>
                        <FormControl>
                          <Input placeholder="Brief description of the issue" className="bg-zinc-100" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />

                  <FormField control={form.control} name="description" render={({
                  field
                }) => <FormItem>
                        <FormLabel>Description *</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Please describe the bug in detail. Include steps to reproduce if possible." className="min-h-[150px] bg-zinc-100 border-zinc-300 text-zinc-900 placeholder:text-zinc-500" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />

                  <FormField control={form.control} name="email" render={({
                  field
                }) => <FormItem>
                        <FormLabel>Email *</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="your.email@example.com" className="bg-zinc-100 text-zinc-500 cursor-not-allowed" disabled readOnly {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />

                  <Button type="submit" disabled={isSubmitting} className="w-auto mx-auto bg-zinc-900 hover:bg-zinc-800 text-zinc-50">
                    {isSubmitting ? "Submitting..." : "Submit Bug Report"}
                  </Button>
                </form>
              </Form>
            </div>
          </TabsContent>

          <TabsContent value="improvement" className="mt-6">
            <div className="bg-card p-6 rounded-lg border">
              <h2 className="text-xl font-semibold mb-4">Suggest an Improvement</h2>
              <p className="text-muted-foreground mb-6">
                Have an idea to make our product better? We're all ears!
              </p>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField control={form.control} name="title" render={({
                  field
                }) => <FormItem>
                        <FormLabel>Suggestion Title *</FormLabel>
                        <FormControl>
                          <Input placeholder="Brief summary of your suggestion" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />

                  <FormField control={form.control} name="description" render={({
                  field
                }) => <FormItem>
                        <FormLabel>Description *</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Describe your improvement idea in detail. How would this make the product better?" className="min-h-[150px] bg-zinc-100 border-zinc-300 text-zinc-900 placeholder:text-zinc-500" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />

                  <FormField control={form.control} name="email" render={({
                  field
                }) => <FormItem>
                        <FormLabel>Email *</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="your.email@example.com" className="bg-zinc-100 text-zinc-500 cursor-not-allowed" disabled readOnly {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />

                  <Button type="submit" disabled={isSubmitting} className="w-auto mx-auto bg-zinc-900 hover:bg-zinc-800 text-zinc-50">
                    {isSubmitting ? "Submitting..." : "Submit Suggestion"}
                  </Button>
                </form>
              </Form>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>;
};
export default Feedback;