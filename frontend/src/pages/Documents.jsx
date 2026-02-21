import React, { useState } from "react";
import { base44 } from "@/api/apiClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Download, Edit, Trash2, Search, Calendar, Eye } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import DocumentForm from "../components/documents/DocumentForm";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function DocumentsPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingDocument, setEditingDocument] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("alle");
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents', currentUser?.organization],
    queryFn: () => base44.entities.Document.filter({ organization: currentUser.organization }, '-upload_date'),
    enabled: !!currentUser?.organization,
  });

  const { data: meetings = [] } = useQuery({
    queryKey: ["fractionMeetings", currentUser?.organization],
    queryFn: () => base44.entities.FractionMeeting.filter({ organization: currentUser.organization }),
    enabled: !!currentUser?.organization,
  });

  React.useEffect(() => {
    if (!currentUser?.organization) return;
    
    const unsubscribe = base44.entities.Document.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['documents', currentUser.organization] });
    });
    
    return unsubscribe;
  }, [currentUser?.organization, queryClient]);

  const saveMutation = useMutation({
    mutationFn: async (doc) => {
      if (doc.id) {
        return base44.entities.Document.update(doc.id, doc);
      }
      return base44.entities.Document.create({ ...doc, organization: currentUser.organization });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', currentUser?.organization] });
      setShowForm(false);
      setEditingDocument(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Document.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', currentUser?.organization] });
    },
  });

  const categoryColors = {
    antrag: "bg-blue-100 text-blue-800",
    beschluss: "bg-green-100 text-green-800",
    bericht: "bg-purple-100 text-purple-800",
    protokoll: "bg-orange-100 text-orange-800",
    praesentation: "bg-pink-100 text-pink-800",
    sonstiges: "bg-slate-100 text-slate-800",
  };

  const categoryLabels = {
    antrag: "Antrag",
    beschluss: "Beschluss",
    bericht: "Bericht",
    protokoll: "Protokoll",
    praesentation: "Präsentation",
    sonstiges: "Sonstiges",
  };

  // Filtere Dokumente
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = !searchQuery || 
      doc.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = categoryFilter === "alle" || doc.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  const getMeetingTitle = (meetingId) => {
    const meeting = meetings.find(m => m.id === meetingId);
    return meeting?.title || "";
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dokumentenverwaltung</h1>
          <p className="text-slate-500 mt-1">
            Dokumente hochladen, organisieren und verwalten
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Neues Dokument
        </Button>
      </div>

      {/* Suche und Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Dokumente durchsuchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alle">Alle Kategorien</SelectItem>
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Dokumentenliste */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Lädt...</div>
      ) : (
        <div className="grid gap-4">
          {filteredDocuments.map((doc) => (
            <Card key={doc.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-slate-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg mb-2">{doc.title}</CardTitle>
                        {doc.description && (
                          <p className="text-sm text-slate-600 mb-3">{doc.description}</p>
                        )}
                        <div className="flex flex-wrap gap-2 items-center">
                          <Badge className={categoryColors[doc.category]}>
                            {categoryLabels[doc.category]}
                          </Badge>
                          {doc.visibility === "oeffentlich" && (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              Öffentlich
                            </Badge>
                          )}
                          {doc.fraction_meeting_id && (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {getMeetingTitle(doc.fraction_meeting_id)}
                            </Badge>
                          )}
                          {doc.tags?.map((tag, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-sm text-slate-500 flex-shrink-0">
                    <p>{formatFileSize(doc.file_size)}</p>
                    {doc.upload_date && (
                      <p>{format(new Date(doc.upload_date), "dd.MM.yyyy", { locale: de })}</p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(doc.file_url, '_blank')}
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Herunterladen
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingDocument(doc);
                      setShowForm(true);
                    }}
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    Bearbeiten
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (confirm('Dokument wirklich löschen?')) {
                        deleteMutation.mutate(doc.id);
                      }
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredDocuments.length === 0 && (
            <Card>
              <CardContent className="text-center py-12 text-slate-500">
                {searchQuery || categoryFilter !== "alle" 
                  ? "Keine Dokumente gefunden" 
                  : "Keine Dokumente vorhanden"}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {showForm && (
        <DocumentForm
          document={editingDocument}
          onSave={(data) => saveMutation.mutate(data)}
          onClose={() => {
            setShowForm(false);
            setEditingDocument(null);
          }}
          saving={saveMutation.isPending}
        />
      )}
    </div>
  );
}