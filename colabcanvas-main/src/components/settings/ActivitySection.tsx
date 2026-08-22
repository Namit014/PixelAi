import { History, Monitor, Smartphone } from "lucide-react";

export const ActivitySection = () => {
  const activities = [
    {
      id: 1,
      action: "Login",
      device: "Chrome on Windows",
      location: "Mumbai, India",
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      icon: Monitor,
    },
    {
      id: 2,
      action: "Login",
      device: "Safari on iPhone",
      location: "Mumbai, India",
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      icon: Smartphone,
    },
  ];

  return (
    <div className="bg-white p-6 rounded-lg border border-zinc-200">
      <div className="flex items-center gap-3 mb-6">
        <History className="w-6 h-6 text-zinc-600" />
        <h2 className="text-xl font-semibold text-zinc-900">Recent Activity</h2>
      </div>

      <div className="space-y-3">
        {activities.map((activity) => {
          const Icon = activity.icon;
          return (
            <div
              key={activity.id}
              className="p-4 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-zinc-100 rounded-lg">
                  <Icon className="w-5 h-5 text-zinc-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-zinc-900">{activity.action}</p>
                    <p className="text-sm text-zinc-500">
                      {activity.timestamp.toLocaleString()}
                    </p>
                  </div>
                  <p className="text-sm text-zinc-600">{activity.device}</p>
                  <p className="text-xs text-zinc-400 mt-1">{activity.location}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
