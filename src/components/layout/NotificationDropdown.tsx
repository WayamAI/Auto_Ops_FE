import { useState } from "react";
import { Bell, Trash2, CheckCircle, X, Loader2, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useNotificationCount, useNotifications, useDeleteNotification, useClearAllNotifications, useMarkAsRead, useMarkAllAsRead } from "@/api/hooks";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function NotificationDropdown() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isClearAllAlertOpen, setIsClearAllAlertOpen] = useState(false);

  const { data: countData, refetch: refetchCount } = useNotificationCount();
  const { data: listData, isLoading: isListLoading, refetch: refetchList } = useNotifications({
    per_page: 3,
    page_no: 1,
  });

  const deleteMutation = useDeleteNotification();
  const clearAllMutation = useClearAllNotifications();
  const markAsReadMutation = useMarkAsRead();
  const markAllAsReadMutation = useMarkAllAsRead();

  const unreadCount = countData?.data?.unread_count || 0;
  const notifications = listData?.data?.items || [];

  const parseDate = (dateStr: string) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  };

  const maskOTP = (html: string) => {
    return html.replace(/\b\d{6}\b/g, "******");
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Notification deleted");
      setDeleteId(null);
      refetchCount();
      refetchList();
    } catch (error) {
      toast.error("Failed to delete notification");
    }
  };

  const handleClearAll = async () => {
    try {
      await clearAllMutation.mutateAsync();
      toast.success("All notifications cleared");
      setIsClearAllAlertOpen(false);
      refetchCount();
      refetchList();
    } catch (error) {
      toast.error("Failed to clear notifications");
    }
  };

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await markAsReadMutation.mutateAsync(id);
      refetchCount();
      refetchList();
    } catch (error) {
      toast.error("Failed to mark as read");
    }
  };

  const handleMarkAllAsRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await markAllAsReadMutation.mutateAsync();
      toast.success("All marked as read");
      refetchCount();
      refetchList();
    } catch (error) {
      toast.error("Failed to mark all as read");
    }
  };

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <button className="relative text-muted-foreground hover:text-foreground transition-all duration-200 outline-none">
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-1 rounded-full bg-destructive border-2 border-background shadow-sm text-[8px] text-white flex items-center justify-center font-bold animate-in zoom-in duration-300">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          className="w-80 bg-popover border border-border/40 p-0 shadow-2xl z-50 overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-secondary/20">
            <h3 className="text-xs font-bold uppercase tracking-widest text-foreground">Notifications</h3>
            {notifications.length > 0 && (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-[10px] font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                >
                  <CheckCircle size={10} />
                  Mark all read
                </button>
                <div className="w-[1px] h-3 bg-border/40" />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsClearAllAlertOpen(true);
                  }}
                  className="text-[10px] font-medium text-muted-foreground hover:text-destructive transition-colors"
                >
                  Clear All
                </button>
              </div>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
            {isListLoading ? (
              <div className="flex flex-col items-center justify-center p-12 text-muted-foreground gap-3">
                <Loader2 size={20} className="animate-spin text-primary" />
                <span className="text-xs font-medium">Fetching notifications...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <div className="w-12 h-12 rounded-full bg-secondary/30 flex items-center justify-center mb-3">
                  <Bell size={20} className="text-muted-foreground/40" />
                </div>
                <h4 className="text-sm font-semibold text-foreground mb-1">All caught up!</h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed">No new notifications at the moment.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/20">
                <AnimatePresence initial={false}>
                  {notifications.map((notification) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className={`group relative p-4 hover:bg-secondary/20 transition-colors ${
                        !notification.is_read ? "bg-primary/5" : ""
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                          !notification.is_read ? "bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]" : "bg-transparent"
                        }`} />
                        <div className="flex-1 min-w-0 pr-6">
                          <h4 className="text-[13px] font-semibold text-foreground mb-1 truncate leading-tight">
                            {notification.subject}
                          </h4>
                          <div 
                            className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: maskOTP(notification.body) }}
                          />
                          <p className="text-[10px] text-muted-foreground/50 mt-2 font-medium flex items-center gap-1.5">
                            <CheckCircle size={10} />
                            {(() => {
                              const date = parseDate(notification.created_at);
                              if (!date) return "Unknown time";
                              return formatDistanceToNow(date, { addSuffix: true });
                            })()}
                          </p>
                        </div>
                      </div>
                      <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!notification.is_read && (
                          <button
                            onClick={(e) => handleMarkAsRead(notification.id, e)}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                            title="Mark as read"
                          >
                            <CheckCircle size={14} />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteId(notification.id);
                          }}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          <div className="p-2 border-t border-border/40 bg-secondary/10">
            <button 
              onClick={() => {
                setIsOpen(false);
                navigate("/notifications");
              }}
              className="w-full py-2 rounded-md text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-all"
            >
              View All History
            </button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="bg-popover border border-border/40">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground flex items-center gap-2">
              <AlertCircle size={18} className="text-destructive" />
              Delete Notification?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-sm">
              Are you sure you want to delete this notification? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-secondary text-foreground hover:bg-secondary/80 border-none">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-destructive text-white hover:bg-destructive/90 border-none"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear All Confirmation */}
      <AlertDialog open={isClearAllAlertOpen} onOpenChange={setIsClearAllAlertOpen}>
        <AlertDialogContent className="bg-popover border border-border/40">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground flex items-center gap-2">
              <Trash2 size={18} className="text-destructive" />
              Clear All Notifications?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-sm">
              This will permanently delete all your notifications. Are you sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-secondary text-foreground hover:bg-secondary/80 border-none">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearAll}
              className="bg-destructive text-white hover:bg-destructive/90 border-none"
            >
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
