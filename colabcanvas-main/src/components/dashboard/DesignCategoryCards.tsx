import { useNavigate } from "react-router-dom";
import posterImg from "@/assets/categories/poster.webp";
import characterImg from "@/assets/categories/character.webp";
import mockupImg from "@/assets/categories/mockup.webp";
import illustrationImg from "@/assets/categories/illustration.webp";
import brandingImg from "@/assets/categories/branding.webp";

const categories = [
  { id: "poster", name: "Poster", image: posterImg },
  { id: "character", name: "Character", image: characterImg },
  { id: "mockup", name: "Mockup", image: mockupImg },
  { id: "illustration", name: "Illustration", image: illustrationImg },
  { id: "branding", name: "Branding", image: brandingImg },
];

export const DesignCategoryCards = () => {
  const navigate = useNavigate();

  const handleCategoryClick = (categoryId: string) => {
    navigate(`/canvas?template_category=${categoryId}`);
  };

  return (
    <div className="mt-16 mb-16">
      <h2 className="text-center text-4xl font-normal mb-8 text-foreground">
        Create{" "}
        <span 
          className="bg-clip-text text-transparent animate-gradient-shift"
          style={{
            backgroundImage: "linear-gradient(90deg, #7D22FF, #FF8870, #FFDEDE, #C196FF, #7D22FF)",
            backgroundSize: "200% 200%"
          }}
        >
          anything
        </span>{" "}
        like a pro
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {categories.map((category) => (
          <div
            key={category.id}
            onClick={() => handleCategoryClick(category.id)}
            className="relative aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer group transition-transform duration-300 hover:scale-105"
          >
              <img
                src={category.image}
                alt={category.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-transparent">
                <div className="p-6">
                  <h3 className="text-white text-2xl font-semibold">
                    {category.name}
                  </h3>
                </div>
              </div>
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
            </div>
        ))}
      </div>
    </div>
  );
};
