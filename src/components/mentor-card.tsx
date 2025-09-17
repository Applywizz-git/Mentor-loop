import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Star, Building, Clock } from "lucide-react";
import { Mentor } from "@/lib/types";

interface MentorCardProps {
  mentor: Mentor;
  onViewProfile: (id: string) => void;
  onBookSession: (id: string) => void;
}

export const MentorCard = ({ mentor, onViewProfile, onBookSession }: MentorCardProps) => {
  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'high': return 'bg-verified-green';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getAvailabilityText = (availability: string) => {
    switch (availability) {
      case 'high': return 'Available this week';
      case 'medium': return 'Limited availability';
      case 'low': return 'Busy this week';
      default: return 'Check availability';
    }
  };

  return (
    <Card className="p-6 hover:shadow-mentor-card transition-shadow duration-200 bg-card border border-border rounded-2xl">
      <CardContent className="p-0">
        <div className="flex items-start gap-4 mb-4">
          <div className="relative">
            <img
              src={mentor.avatar}
              alt={mentor.name}
              className="w-16 h-16 rounded-full object-cover"
            />
            {mentor.verified && (
              <div className="absolute -bottom-1 -right-1 bg-verified-green text-white text-xs px-2 py-0.5 rounded-full font-medium">
                ✓ Verified
              </div>
            )}
          </div>
          
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-card-foreground mb-1">{mentor.name}</h3>
            <p className="text-muted-foreground mb-2">{mentor.title}</p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Building className="w-4 h-4" />
              <span>{mentor.company}</span>
              <span>•</span>
              <span>{mentor.experience} years</span>
            </div>
          </div>
          
          <div className="text-right">
            <div className="flex items-center gap-1 mb-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="font-medium">{mentor.rating}</span>
              <span className="text-muted-foreground">({mentor.reviews})</span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 mb-4">
          {mentor.specialties.map((specialty) => (
            <Badge key={specialty} variant="secondary" className="text-xs">
              {specialty}
            </Badge>
          ))}
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${getAvailabilityColor(mentor.availability)}`} />
            <span className="text-sm text-muted-foreground">
              {getAvailabilityText(mentor.availability)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-lg font-semibold">${mentor.price}</span>
            <span className="text-muted-foreground text-sm">/session</span>
          </div>
        </div>
        
        <div className="flex gap-3 mt-4">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => onViewProfile(mentor.id)}
          >
            View Profile
          </Button>
         <Button
  variant="default"
  className="flex-1"
  onClick={() => onBookSession(mentor.id)}
>
  Book Session
</Button>

        </div>
      </CardContent>
    </Card>
  );
};