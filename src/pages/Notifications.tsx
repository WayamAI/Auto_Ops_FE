import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import AppLayout from "@/components/layout/AppLayout";
import { 
  Bell, 
  Trash2, 
  CheckCircle, 
  X, 
  Loader2, 
  AlertCircle, 
  Search, 
  ChevronLeft, 
  ChevronRight,
  MoreHorizontal,
  Mail,
  Calendar,
  Eye,
  Filter
} from "lucide-react";
import { useNotifications, useDeleteNotification, useClearAllNotifications, useNotificationCount, useMarkAsRead, useMarkAllAsRead } from "@/api/hooks";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
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
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { NotificationItem } from "@/api/types";

export default function Notifications() {
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
  const [isClearAllAlertOpen, setIsClearAllAlertOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: listData, isLoading, refetch } = useNotifications({
    per_page: perPage,
    page_no: currentPage,
  });

  const { refetch: refetchCount } = useNotificationCount();
  const deleteMutation = useDeleteNotification();
  const clearAllMutation = useClearAllNotifications();
  const markAsReadMutation = useMarkAsRead();
  const markAllAsReadMutation = useMarkAllAsRead();

  const notifications = listData?.data?.items || [];
  const totalItems = listData?.data?.total || 0;
  const totalPages = Math.ceil(totalItems / perPage);

  const formatToIST = (dateStr: string) => {
    if (!dateStr) return "N/A";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return "Invalid Date";
      return format(date, "dd-MM-yyyy");
    } catch {
      return "Invalid Date";
    }
  };

  const getRelativeTime = (dateStr: string) => {
    if (!dateStr) return "Unknown time";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return "Unknown time";
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return "Unknown time";
    }
  };

  const maskOTP = (html: string) => {
    return html.replace(/\b\d{6}\b/g, "******");
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Notification deleted successfully");
      setDeleteId(null);
      refetch();
      refetchCount();
    } catch (error) {
      toast.error("Failed to delete notification");
    }
  };

  const handleClearAll = async () => {
    try {
      await clearAllMutation.mutateAsync();
      toast.success("All notifications cleared");
      setIsClearAllAlertOpen(false);
      refetch();
      refetchCount();
    } catch (error) {
      toast.error("Failed to clear notifications");
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsReadMutation.mutateAsync(id);
      refetch();
      refetchCount();
    } catch (error) {
      toast.error("Failed to mark as read");
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsReadMutation.mutateAsync();
      toast.success("All notifications marked as read");
      refetch();
      refetchCount();
    } catch (error) {
      toast.error("Failed to mark all as read");
    }
  };

  const filteredNotifications = notifications.filter(n => 
    n.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    n.body.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AppLayout title="Notification History" subtitle="Manage and view your activity alerts">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border/60 shadow-sm">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 bg-secondary/30 border border-border/40 rounded-lg pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all"
            />
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 h-10 px-4 rounded-lg bg-secondary/50 border border-border/40 text-sm font-medium hover:bg-secondary/70 transition-all">
              <Filter size={14} />
              Filter
            </button>
            {notifications.length > 0 && (
              <>
                <button
                  onClick={handleMarkAllAsRead}
                  className="flex items-center gap-2 h-10 px-4 rounded-lg bg-primary/10 border border-primary/20 text-primary text-sm font-medium hover:bg-primary/20 transition-all"
                >
                  <CheckCircle size={14} />
                  Mark All Read
                </button>
                <button
                  onClick={() => setIsClearAllAlertOpen(true)}
                  className="flex items-center gap-2 h-10 px-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium hover:bg-destructive/20 transition-all"
                >
                  <Trash2 size={14} />
                  Clear All
                </button>
              </>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="bg-card rounded-xl border border-border/60 overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-24 text-muted-foreground gap-4">
              <div className="relative">
                <Loader2 size={40} className="animate-spin text-primary/60" />
                <Bell size={20} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary" />
              </div>
              <p className="text-sm font-medium animate-pulse">Loading your history...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-24 text-center">
              <div className="w-20 h-20 rounded-full bg-secondary/30 flex items-center justify-center mb-6 ring-8 ring-secondary/10">
                <Bell size={32} className="text-muted-foreground/30" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">No notifications found</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
                {searchTerm ? "Try adjusting your search terms or filters." : "Your notification history is empty."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              <AnimatePresence initial={false}>
                {filteredNotifications.map((notification) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`group p-6 hover:bg-secondary/10 transition-all relative ${
                      !notification.is_read ? "bg-primary/[0.02]" : ""
                    }`}
                  >
                    <div className="flex gap-5">
                      <div className={`mt-1.5 w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
                        !notification.is_read 
                          ? "bg-primary/10 border-primary/20 text-primary shadow-sm" 
                          : "bg-secondary/40 border-border/40 text-muted-foreground"
                      }`}>
                        <Mail size={18} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <h4 className={`text-[15px] font-bold tracking-tight leading-tight transition-colors ${
                            !notification.is_read ? "text-foreground" : "text-foreground/80"
                          }`}>
                            {notification.subject}
                          </h4>
                          <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground/60 whitespace-nowrap">
                            <Calendar size={12} />
                            {formatToIST(notification.created_at)}
                          </div>
                        </div>

                        <div 
                          className="text-[13px] text-muted-foreground/80 leading-relaxed max-w-3xl mb-4"
                          dangerouslySetInnerHTML={{ __html: maskOTP(notification.body) }}
                        />

                        <div className="flex items-center gap-4">
                          <span className="text-[11px] font-semibold text-muted-foreground/40 flex items-center gap-1.5">
                            <CheckCircle size={12} className={!notification.is_read ? "text-primary/60" : "text-muted-foreground/20"} />
                            {getRelativeTime(notification.created_at)}
                          </span>
                          <div className="h-1 w-1 rounded-full bg-border" />
                          <button 
                            onClick={() => {
                              setSelectedNotification(notification);
                              if (!notification.is_read) {
                                handleMarkAsRead(notification.id);
                              }
                            }}
                            className="text-[11px] font-bold text-primary hover:underline underline-offset-4 flex items-center gap-1"
                          >
                            <Eye size={12} />
                            View Details
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!notification.is_read && (
                          <button
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all shadow-sm"
                            title="Mark as read"
                          >
                            <CheckCircle size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteId(notification.id)}
                          className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-all shadow-sm"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalItems > 0 && (
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 py-8 border-t border-border/40 mt-6">
            <div className="flex items-center gap-3 text-sm text-muted-foreground bg-secondary/20 px-4 py-2 rounded-lg border border-border/40">
              <span>Show</span>
              <Select
                value={String(perPage)}
                onValueChange={(value) => {
                  setPerPage(Number(value));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-[70px] bg-background border-border/40">
                  <SelectValue placeholder={String(perPage)} />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border/40">
                  {[10, 20, 50, 100].map((size) => (
                    <SelectItem key={size} value={String(size)} className="text-foreground focus:bg-primary/20">
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span>records per page</span>
              <span className="ml-4 pl-4 border-l border-border/40">
                Showing {Math.min((currentPage - 1) * perPage + 1, totalItems)} to {Math.min(currentPage * perPage, totalItems)} of {totalItems}
              </span>
            </div>

            {totalPages > 1 && (
              <Pagination className="mx-0 w-auto">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentPage(p => Math.max(1, p - 1));
                      }}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    if (
                      page === 1 || 
                      page === totalPages || 
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <PaginationItem key={page}>
                          <PaginationLink 
                            isActive={currentPage === page}
                            onClick={(e) => {
                              e.preventDefault();
                              setCurrentPage(page);
                            }}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    } else if (
                      (page === currentPage - 2 && page > 1) || 
                      (page === currentPage + 2 && page < totalPages)
                    ) {
                      return (
                        <PaginationItem key={page}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      );
                    }
                    return null;
                  })}

                  <PaginationItem>
                    <PaginationNext 
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentPage(p => Math.min(totalPages, p + 1));
                      }}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="bg-popover border border-border/40">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground flex items-center gap-2 font-bold">
              <AlertCircle size={20} className="text-destructive" />
              Delete Notification?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-sm">
              This action will permanently remove this notification from your history. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="bg-secondary text-foreground hover:bg-secondary/80 border-none px-6">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-destructive text-white hover:bg-destructive/90 border-none px-6 font-bold"
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
            <AlertDialogTitle className="text-foreground flex items-center gap-2 font-bold">
              <Trash2 size={20} className="text-destructive" />
              Clear All Notifications?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-sm">
              You are about to delete all your notification history. This action is irreversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="bg-secondary text-foreground hover:bg-secondary/80 border-none px-6">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearAll}
              className="bg-destructive text-white hover:bg-destructive/90 border-none px-6 font-bold"
            >
              Clear All History
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Notification Details Modal */}
      <Dialog open={!!selectedNotification} onOpenChange={(open) => !open && setSelectedNotification(null)}>
        <DialogContent className="max-w-2xl bg-popover border border-border/40 p-0 overflow-hidden rounded-2xl shadow-2xl">
          <div className="h-24 bg-gradient-to-r from-primary/20 via-primary/5 to-transparent border-b border-border/40 flex items-center px-8">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm">
              <Mail size={24} />
            </div>
            <div className="ml-5">
              <DialogTitle className="text-xl font-bold text-foreground">Notification Details</DialogTitle>
              <DialogDescription className="text-muted-foreground mt-1">
                {selectedNotification && formatToIST(selectedNotification.created_at)}
              </DialogDescription>
            </div>
          </div>
          
          <div className="p-8">
            <h3 className="text-lg font-bold text-foreground mb-6 leading-tight">
              {selectedNotification?.subject}
            </h3>
            
            <div className="bg-secondary/20 border border-border/40 rounded-xl p-6 mb-6 max-h-[400px] overflow-y-auto custom-scrollbar">
              <div 
                className="text-sm text-foreground/90 leading-relaxed space-y-4"
                dangerouslySetInnerHTML={{ __html: maskOTP(selectedNotification?.body || "") }}
              />
            </div>

            <div className="flex items-center justify-end pt-2">
              <Button 
                onClick={() => setSelectedNotification(null)}
                className="bg-secondary hover:bg-secondary/80 text-foreground border-none px-8 font-bold rounded-lg"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
