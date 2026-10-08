import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { Panel } from '../components/Form';
import { NccCrest, ArmyWingEmblem, NavyWingEmblem, AirWingEmblem } from '../components/NccLogo';

const DRILL_COMMANDS = [
  { cmd: 'Savdhan (सावधान)', action: 'Attention position. Heels touching together, toes 30° apart, hands firmly closed into fists with thumbs pointing downwards aligned with trouser seams.' },
  { cmd: 'Vishram (विश्राम)', action: 'Stand at ease. Left foot moved 12 inches to the left. Hands clasped behind back, left hand over right palm with thumbs interlocked.' },
  { cmd: 'Aram Se (आराम से)', action: 'Stand easy. Relax upper torso while keeping feet in Vishram position. Speaking or moving head without permission is prohibited.' },
  { cmd: 'Dahine Mur (दाहिने मुड़)', action: 'Turn 90 degrees to the right on the right heel and left toe. Keep body erect and freeze in Savdhan.' },
  { cmd: 'Baayein Mur (बायें मुड़)', action: 'Turn 90 degrees to the left on the left heel and right toe. Bring right foot stamping into position.' },
  { cmd: 'Peeche Mur (पीछे मुड़)', action: 'About turn 180 degrees via the right side on right heel and left toe. Maintain balance without swaying shoulders.' },
  { cmd: 'Khuli Line Chal (खुली लाइन चल)', action: 'Front rank takes 2 paces forward, rear rank takes 2 paces backward for VIP inspection or rifle presentation.' },
  { cmd: 'Nikat Line Chal (निकट लाइन चल)', action: 'Close ranks immediately following VIP inspection. Front rank takes 2 paces backward, rear takes 2 paces forward.' },
  { cmd: 'Tez Chal (तेज़ चल)', action: 'Quick march. First step with left foot, standard pace 30 inches, cadence 120 paces per minute (110 for SW).' },
  { cmd: 'Tham (थम)', action: 'Halt. Complete the current pace, check step with right foot, and bring left foot firmly to heel with zero sway.' },
];

const INITIAL_BOOK_FORM = {
  title: '',
  subject: '',
  category: 'handbook',
  certificate_level: 'common',
  wing: 'common',
  author: 'Directorate General NCC, New Delhi',
  edition_year: '2026 Edition',
  description: '',
  cover_icon: '📖',
  file_url: '',
  is_published: true,
  chapters: [
    {
      chapter_number: 1,
      title: 'Introduction & Core Principles',
      content: 'Overview of standard guidelines and syllabus breakdown.',
      key_points: ['Key objective and learning outcome 1', 'Key objective and learning outcome 2'],
    },
  ],
};

const COVER_ICONS = ['📖', '📚', '🎯', '🗺️', '🛡️', '⚓', '✈️', '🌲', '⭐', '🇮🇳', '📋', '🏥'];

export default function KnowledgeView() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'co' || user?.role === 'co_admin';

  // Navigation tab
  const [activeTab, setActiveTab] = useState('library'); // 'library' | 'handbook' | 'ranks'

  // Books State
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWing, setSelectedWing] = useState('all');
  const [selectedCert, setSelectedCert] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Interactive Reader Modal State
  const [readingBook, setReadingBook] = useState(null);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);

  // Admin Book Management Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingBookId, setEditingBookId] = useState(null);
  const [bookFormData, setBookFormData] = useState(INITIAL_BOOK_FORM);
  const [savingBook, setSavingBook] = useState(false);
  const [adminActionMsg, setAdminActionMsg] = useState('');

  // Fetch Library Books
  const fetchLibrary = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.listStudyMaterials();
      setBooks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load library:', err);
      setError(err?.message || 'Could not load syllabus books. Please try refreshing.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLibrary();
  }, []);

  // Filtered Books
  const filteredBooks = useMemo(() => {
    return books.filter(b => {
      // Wing filter
      if (selectedWing !== 'all' && (b.wing || '').toLowerCase() !== selectedWing.toLowerCase()) {
        return false;
      }
      // Cert filter
      if (selectedCert !== 'all') {
        const certLower = (b.certificate_level || '').toLowerCase();
        if (selectedCert === 'common' && certLower !== 'common' && certLower !== 'all') {
          return false;
        }
        if (selectedCert !== 'common' && certLower !== selectedCert.toLowerCase() && certLower !== 'all') {
          return false;
        }
      }
      // Category filter
      if (selectedCategory !== 'all' && (b.category || '').toLowerCase() !== selectedCategory.toLowerCase()) {
        return false;
      }
      // Search text query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inTitle = (b.title || '').toLowerCase().includes(q);
        const inSubj = (b.subject || '').toLowerCase().includes(q);
        const inDesc = (b.description || '').toLowerCase().includes(q);
        const inAuthor = (b.author || '').toLowerCase().includes(q);
        const inChapters = (b.chapters || []).some(ch =>
          (ch.title || '').toLowerCase().includes(q) ||
          (ch.content || '').toLowerCase().includes(q) ||
          (ch.key_points || []).some(kp => kp.toLowerCase().includes(q))
        );
        return inTitle || inSubj || inDesc || inAuthor || inChapters;
      }
      return true;
    });
  }, [books, selectedWing, selectedCert, selectedCategory, searchQuery]);

  // Handle Opening Digital Document Reader
  const handleOpenReader = (book) => {
    setReadingBook(book);
    setCurrentChapterIndex(0);
  };

  // Handle Admin Add Book
  const handleOpenCreateModal = () => {
    setEditingBookId(null);
    setBookFormData(INITIAL_BOOK_FORM);
    setAdminActionMsg('');
    setIsEditModalOpen(true);
  };

  // Handle Admin Edit Book
  const handleOpenEditModal = (book) => {
    setEditingBookId(book.id);
    setBookFormData({
      title: book.title || '',
      subject: book.subject || '',
      category: book.category || 'handbook',
      certificate_level: book.certificate_level || 'common',
      wing: book.wing || 'common',
      author: book.author || 'Directorate General NCC, New Delhi',
      edition_year: book.edition_year || '2026 Edition',
      description: book.description || '',
      cover_icon: book.cover_icon || '📖',
      file_url: book.file_url || '',
      is_published: book.is_published ?? true,
      chapters: Array.isArray(book.chapters) && book.chapters.length > 0 ? book.chapters : [
        {
          chapter_number: 1,
          title: 'Introduction & Core Principles',
          content: 'Overview of syllabus topics.',
          key_points: ['Key objective 1'],
        },
      ],
    });
    setAdminActionMsg('');
    setIsEditModalOpen(true);
  };

  // Handle Admin Delete Book
  const handleDeleteBook = async (bookId, title) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${title}" from the NCC syllabus platform?`)) {
      return;
    }
    try {
      await api.deleteStudyMaterial(bookId);
      setBooks(prev => prev.filter(b => b.id !== bookId));
      if (readingBook?.id === bookId) setReadingBook(null);
    } catch (err) {
      alert(`Failed to delete book: ${err.message || 'Unknown error'}`);
    }
  };

  // Handle Admin Save Book (Create / Update)
  const handleSaveBook = async (e) => {
    e.preventDefault();
    setSavingBook(true);
    setAdminActionMsg('');
    try {
      if (editingBookId) {
        const updated = await api.updateStudyMaterial(editingBookId, bookFormData);
        setBooks(prev => prev.map(b => (b.id === editingBookId ? updated : b)));
        if (readingBook?.id === editingBookId) setReadingBook(updated);
        setAdminActionMsg('✓ Study material updated successfully.');
      } else {
        const created = await api.createStudyMaterial(bookFormData);
        setBooks(prev => [created, ...prev]);
        setAdminActionMsg('✓ New syllabus book published to library.');
      }
      setTimeout(() => {
        setIsEditModalOpen(false);
        setAdminActionMsg('');
      }, 1000);
    } catch (err) {
      setAdminActionMsg(`Error: ${err.message || 'Failed to save book'}`);
    } finally {
      setSavingBook(false);
    }
  };

  // Chapter editing helpers for Admin
  const handleAddChapter = () => {
    setBookFormData(prev => ({
      ...prev,
      chapters: [
        ...prev.chapters,
        {
          chapter_number: prev.chapters.length + 1,
          title: `Chapter ${prev.chapters.length + 1}: `,
          content: '',
          key_points: ['Point 1'],
        },
      ],
    }));
  };

  const handleUpdateChapter = (idx, field, value) => {
    setBookFormData(prev => {
      const updatedChapters = [...prev.chapters];
      updatedChapters[idx] = { ...updatedChapters[idx], [field]: value };
      return { ...prev, chapters: updatedChapters };
    });
  };

  const handleUpdateChapterPoints = (idx, rawPointsText) => {
    const pointsArray = rawPointsText.split('\n').filter(p => p.trim().length > 0);
    setBookFormData(prev => {
      const updatedChapters = [...prev.chapters];
      updatedChapters[idx] = { ...updatedChapters[idx], key_points: pointsArray };
      return { ...prev, chapters: updatedChapters };
    });
  };

  const handleRemoveChapter = (idx) => {
    if (bookFormData.chapters.length <= 1) {
      alert('A syllabus book must contain at least one chapter.');
      return;
    }
    setBookFormData(prev => ({
      ...prev,
      chapters: prev.chapters.filter((_, i) => i !== idx).map((ch, i) => ({ ...ch, chapter_number: i + 1 })),
    }));
  };

  // Wing badge styler
  const getWingBadge = (wing) => {
    const w = (wing || 'common').toLowerCase();
    if (w === 'army') return { label: 'Army Wing', bg: 'rgba(200, 16, 46, 0.1)', color: 'var(--ncc-army-red)', border: 'var(--ncc-army-red)' };
    if (w === 'navy') return { label: 'Naval Wing', bg: 'rgba(0, 32, 91, 0.1)', color: 'var(--navy-900)', border: 'var(--navy-800)' };
    if (w === 'air') return { label: 'Air Wing', bg: 'rgba(74, 144, 226, 0.12)', color: 'var(--ncc-air-blue)', border: 'var(--ncc-air-blue)' };
    return { label: 'Common Tri-Service', bg: 'rgba(212, 175, 55, 0.15)', color: 'var(--ncc-gold-dark)', border: 'var(--ncc-gold)' };
  };

  // Certificate badge styler
  const getCertBadge = (cert) => {
    const c = (cert || 'common').toUpperCase();
    if (c === 'A') return { label: "Cert 'A' Syllabus", bg: 'rgba(16, 185, 129, 0.12)', color: '#059669' };
    if (c === 'B') return { label: "Cert 'B' Syllabus", bg: 'rgba(217, 119, 6, 0.12)', color: '#d97706' };
    if (c === 'C') return { label: "Cert 'C' Syllabus", bg: 'rgba(220, 38, 38, 0.12)', color: '#dc2626' };
    return { label: 'Common Core', bg: 'rgba(11, 37, 69, 0.08)', color: 'var(--navy-900)' };
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <NccCrest size={48} />
          <div>
            <div className="page-eyebrow">
              <span className="dot" />
              <span>DIRECTORATE GENERAL NCC — OFFICIAL ACADEMIC PLATFORM</span>
            </div>
            <h2>Books & Syllabus Knowledge Platform</h2>
            <p>
              Authoritative curriculum textbooks, specialized wing manuals, and official training syllabus references for NCC Cadets and Officers.
            </p>
          </div>
        </div>

        {/* Tab Controls & Mock Arena CTA */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            className={activeTab === 'library' ? 'primary' : 'secondary'}
            onClick={() => setActiveTab('library')}
            style={{ height: 36, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            📚 Books & Syllabus Library
          </button>
          <button
            type="button"
            className={activeTab === 'handbook' ? 'primary' : 'secondary'}
            onClick={() => setActiveTab('handbook')}
            style={{ height: 36, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            📖 Drill Commands Handbook
          </button>
          <button
            type="button"
            className={activeTab === 'ranks' ? 'primary' : 'secondary'}
            onClick={() => setActiveTab('ranks')}
            style={{ height: 36, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            🎖️ Ranks & Insignias
          </button>
          <Link
            to="/ncc-mock-tests"
            className="secondary"
            style={{
              textDecoration: 'none',
              height: 36,
              fontSize: 13,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              border: '1px solid var(--saffron-500)',
              color: 'var(--saffron-600)',
              fontWeight: 700,
            }}
          >
            🎯 Practice in Mock Arena →
          </Link>
        </div>
      </div>

      {/* =========================================================================
          TAB 1: OFFICIAL BOOKS & SYLLABUS LIBRARY
          ========================================================================= */}
      {activeTab === 'library' && (
        <div>
          {/* Platform Quick Stats & Admin Banner */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 12,
            marginBottom: 20,
          }}>
            <div style={{
              background: '#FFFFFF',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              boxShadow: 'var(--shadow-card)',
            }}>
              <span style={{ fontSize: 26 }}>📚</span>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--navy-900)' }}>{books.length}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Official Textbooks</div>
              </div>
            </div>

            <div style={{
              background: '#FFFFFF',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              boxShadow: 'var(--shadow-card)',
            }}>
              <span style={{ fontSize: 26 }}>🇮🇳</span>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--navy-900)' }}>3 Wings + Core</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Army, Navy, Air Wing</div>
              </div>
            </div>

            <div style={{
              background: '#FFFFFF',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              boxShadow: 'var(--shadow-card)',
            }}>
              <span style={{ fontSize: 26 }}>🎖️</span>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--navy-900)' }}>A, B & C Certs</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Examinations Covered</div>
              </div>
            </div>

            <div style={{
              background: '#FFFFFF',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              boxShadow: 'var(--shadow-card)',
            }}>
              <span style={{ fontSize: 26 }}>⚡</span>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--navy-900)' }}>
                  {books.reduce((acc, b) => acc + (b.chapters?.length || 0), 0)} Chapters
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Interactive Learning Content</div>
              </div>
            </div>
          </div>

          {/* Search, Filter Toolbar & Admin Creation Trigger */}
          <Panel title="Official Syllabus Library Catalog" guideTag="DG NCC CURRICULUM">
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              marginBottom: 16,
            }}>
              {/* Row 1: Search Input & Admin Add Button */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ flex: 1, minWidth: 260, position: 'relative' }}>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search books, syllabus topics, chapters, weapon types, or authors..."
                    style={{
                      width: '100%',
                      height: 40,
                      padding: '0 14px 0 36px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border)',
                      fontSize: 13,
                    }}
                  />
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.5, fontSize: 14 }}>
                    🔍
                  </span>
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      style={{
                        position: 'absolute',
                        right: 10,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 12,
                        color: 'var(--text-muted)',
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>

                {isAdmin && (
                  <button
                    type="button"
                    className="primary"
                    onClick={handleOpenCreateModal}
                    style={{
                      height: 40,
                      padding: '0 18px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      fontWeight: 700,
                      boxShadow: '0 2px 6px rgba(11,37,69,0.2)',
                    }}
                  >
                    <span>➕</span>
                    <span>Add Book / Syllabus Manual</span>
                  </button>
                )}
              </div>

              {/* Row 2: Filter Pills */}
              <div style={{
                display: 'flex',
                gap: 16,
                flexWrap: 'wrap',
                alignItems: 'center',
                paddingTop: 10,
                borderTop: '1px solid var(--border)',
              }}>
                {/* Wing Filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Wing:</span>
                  {[
                    { id: 'all', label: 'All Wings' },
                    { id: 'common', label: 'Common Core' },
                    { id: 'army', label: 'Army' },
                    { id: 'navy', label: 'Navy' },
                    { id: 'air', label: 'Air' },
                  ].map(w => (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => setSelectedWing(w.id)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 14,
                        fontSize: 11,
                        fontWeight: selectedWing === w.id ? 700 : 500,
                        border: selectedWing === w.id ? '1px solid var(--navy-900)' : '1px solid var(--border)',
                        background: selectedWing === w.id ? 'var(--navy-900)' : '#FFFFFF',
                        color: selectedWing === w.id ? '#FFFFFF' : 'var(--text-body)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>

                {/* Certificate Filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Cert:</span>
                  {[
                    { id: 'all', label: 'All Certs' },
                    { id: 'common', label: 'Common' },
                    { id: 'A', label: 'Cert A' },
                    { id: 'B', label: 'Cert B' },
                    { id: 'C', label: 'Cert C' },
                  ].map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCert(c.id)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 14,
                        fontSize: 11,
                        fontWeight: selectedCert === c.id ? 700 : 500,
                        border: selectedCert === c.id ? '1px solid var(--saffron-600)' : '1px solid var(--border)',
                        background: selectedCert === c.id ? 'var(--saffron-600)' : '#FFFFFF',
                        color: selectedCert === c.id ? '#FFFFFF' : 'var(--text-body)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>

                {/* Reset Filters */}
                {(selectedWing !== 'all' || selectedCert !== 'all' || searchQuery.trim()) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedWing('all');
                      setSelectedCert('all');
                      setSearchQuery('');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--navy-700)',
                      fontSize: 11,
                      textDecoration: 'underline',
                      cursor: 'pointer',
                      padding: '4px 6px',
                    }}
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div style={{
                background: 'rgba(220,38,38,0.1)',
                color: '#dc2626',
                padding: '12px 16px',
                borderRadius: 'var(--radius-sm)',
                marginBottom: 16,
                fontSize: 13,
                fontWeight: 600,
              }}>
                ⚠️ {error}
              </div>
            )}

            {/* Loading Indicator */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🔄</div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>Loading official NCC syllabus repository...</div>
              </div>
            ) : filteredBooks.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '50px 20px',
                background: 'var(--bg-main)',
                borderRadius: 'var(--radius-sm)',
                border: '1px dashed var(--border)',
              }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>📖</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy-900)' }}>
                  No syllabus books found matching criteria
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                  Try resetting your wing/certificate filters or adjusting your search keyword.
                </p>
                {isAdmin && (
                  <button
                    type="button"
                    className="primary"
                    onClick={handleOpenCreateModal}
                    style={{ marginTop: 14, height: 36 }}
                  >
                    ➕ Publish New Syllabus Book
                  </button>
                )}
              </div>
            ) : (
              /* Books Grid */
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: 18,
              }}>
                {filteredBooks.map((book) => {
                  const wingBadge = getWingBadge(book.wing);
                  const certBadge = getCertBadge(book.certificate_level);
                  const chapterCount = book.chapters?.length || 0;

                  return (
                    <div
                      key={book.id}
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        padding: 18,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxShadow: 'var(--shadow-card)',
                        position: 'relative',
                        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                      }}
                    >
                      {/* Top Badges & Cover Icon */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                          <div style={{
                            width: 48,
                            height: 48,
                            borderRadius: 'var(--radius-sm)',
                            background: 'linear-gradient(135deg, rgba(11,37,69,0.08), rgba(212,175,55,0.15))',
                            border: '1px solid var(--border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 24,
                          }}>
                            {book.cover_icon || '📖'}
                          </div>

                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: 4,
                                fontSize: 10,
                                fontWeight: 800,
                                background: wingBadge.bg,
                                color: wingBadge.color,
                                border: `1px solid ${wingBadge.border}`,
                                textTransform: 'uppercase',
                              }}
                            >
                              {wingBadge.label}
                            </span>
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: 4,
                                fontSize: 10,
                                fontWeight: 800,
                                background: certBadge.bg,
                                color: certBadge.color,
                              }}
                            >
                              {certBadge.label}
                            </span>
                          </div>
                        </div>

                        {/* Title & Subject */}
                        <h3 style={{
                          fontSize: 16,
                          fontWeight: 800,
                          color: 'var(--navy-900)',
                          margin: '0 0 6px 0',
                          lineHeight: 1.35,
                        }}>
                          {book.title}
                        </h3>

                        <div style={{
                          fontSize: 12,
                          color: 'var(--ncc-gold-dark)',
                          fontWeight: 700,
                          marginBottom: 8,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}>
                          <span>🔖 {book.subject}</span>
                          {book.edition_year && (
                            <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>• {book.edition_year}</span>
                          )}
                        </div>

                        {/* Description Snippet */}
                        <p style={{
                          fontSize: 12,
                          color: 'var(--text-body)',
                          lineHeight: 1.5,
                          marginBottom: 14,
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}>
                          {book.description || 'Official syllabus manual and guidance document approved for NCC training contingents.'}
                        </p>

                        {/* Metadata Tag Row */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          fontSize: 11,
                          color: 'var(--text-muted)',
                          marginBottom: 16,
                          flexWrap: 'wrap',
                        }}>
                          <span>✍️ {book.author || 'DG NCC'}</span>
                          <span>•</span>
                          <span style={{ fontWeight: 700, color: 'var(--navy-800)' }}>
                            📑 {chapterCount} {chapterCount === 1 ? 'Chapter' : 'Chapters'}
                          </span>
                          {book.file_url && (
                            <>
                              <span>•</span>
                              <span style={{ color: 'var(--success)', fontWeight: 700 }}>📄 Official PDF Linked</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div style={{
                        paddingTop: 12,
                        borderTop: '1px solid var(--border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 8,
                      }}>
                        <button
                          type="button"
                          className="primary"
                          onClick={() => handleOpenReader(book)}
                          style={{
                            height: 34,
                            fontSize: 12,
                            padding: '0 14px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            flex: 1,
                            justifyContent: 'center',
                          }}
                        >
                          <span>📖</span>
                          <span>Read Chapters & Syllabus</span>
                        </button>

                        {/* Admin Action Menu */}
                        {isAdmin && (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              type="button"
                              className="secondary"
                              onClick={() => handleOpenEditModal(book)}
                              title="Edit Syllabus Book"
                              style={{
                                height: 34,
                                width: 34,
                                padding: 0,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 13,
                              }}
                            >
                              ✏️
                            </button>
                            <button
                              type="button"
                              className="secondary"
                              onClick={() => handleDeleteBook(book.id, book.title)}
                              title="Delete Book"
                              style={{
                                height: 34,
                                width: 34,
                                padding: 0,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 13,
                                color: '#dc2626',
                                borderColor: 'rgba(220,38,38,0.3)',
                              }}
                            >
                              🗑️
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>
      )}

      {/* =========================================================================
          TAB 2: DRILL COMMANDS HANDBOOK
          ========================================================================= */}
      {activeTab === 'handbook' && (
        <Panel title="Official National Cadet Corps Drill Manual" tag="CEREMONIAL STANDARDS">
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
            Command voice calls and executions standardized by the Directorate General NCC for parade discipline, Republic Day Contingents, and Guard of Honour:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {DRILL_COMMANDS.map((drill, idx) => (
              <div
                key={idx}
                style={{
                  padding: '14px 18px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  background: '#FFFFFF',
                  display: 'flex',
                  gap: 16,
                  alignItems: 'flex-start',
                  boxShadow: 'var(--shadow-card)',
                }}
              >
                <div style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-xs)',
                  background: 'var(--navy-900)',
                  color: '#FFF',
                  fontWeight: 700,
                  fontSize: 12,
                  flexShrink: 0,
                  letterSpacing: '0.02em',
                }}>
                  {drill.cmd}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-body)', lineHeight: 1.5, paddingTop: 3 }}>
                  {drill.action}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* =========================================================================
          TAB 3: RANKS & INSIGNIAS
          ========================================================================= */}
      {activeTab === 'ranks' && (
        <Panel title="NCC Cadet Rank Hierarchy & Tri-Service Structure" tag="SENIORITY LADDER">
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
            Rank progression system established under the NCC Act (1948) governing both Senior Wing/Division (Colleges) and Junior Wing/Division (Schools):
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 18 }}>
            {/* Senior Wing / Division */}
            <div style={{ background: '#FFFFFF', border: '1px solid var(--border)', padding: 18, borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow-card)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
                <ArmyWingEmblem size={28} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ncc-army-red)' }}>
                    SENIOR DIVISION / SENIOR WING (SD / SW)
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>College & University Level Cadets</div>
                </div>
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--navy-900)', lineHeight: 1.9 }}>
                <li><strong>Senior Under Officer (SUO)</strong> — Top Cadet Rank, Battalion Cadet Adjutant</li>
                <li><strong>Under Officer (UO)</strong> — Company Commander Cadet</li>
                <li><strong>Company Sergeant Major (CSM)</strong> — Drill & Muster Discipline Head</li>
                <li><strong>Company Quartermaster Sergeant (CQMS)</strong> — Arms & Logistics Kote Incharge</li>
                <li><strong>Sergeant (SGT)</strong> — Section Commander</li>
                <li><strong>Corporal (CPL)</strong> — Second-in-Command of Section</li>
                <li><strong>Lance Corporal (L/CPL)</strong> — Leading Cadet</li>
                <li><strong>Cadet (CDT)</strong> — Basic Recruit / Entrant</li>
              </ul>
            </div>

            {/* Junior Wing / Division */}
            <div style={{ background: '#FFFFFF', border: '1px solid var(--border)', padding: 18, borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow-card)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
                <AirWingEmblem size={28} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--navy-900)' }}>
                    JUNIOR DIVISION / JUNIOR WING (JD / JW)
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>High School Level Cadets</div>
                </div>
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--navy-900)', lineHeight: 1.9 }}>
                <li><strong>Troop Sergeant Major (TSM)</strong> — Senior Cadet of School Troop</li>
                <li><strong>Troop Quartermaster Sergeant (TQMS)</strong> — Equipment Stores Head</li>
                <li><strong>Sergeant</strong> — Section Lead</li>
                <li><strong>Corporal</strong> — Deputy Squad Leader</li>
                <li><strong>Lance Corporal</strong> — Section Point Cadet</li>
                <li><strong>Junior Cadet</strong> — Entry Standard</li>
              </ul>
            </div>

            {/* Naval & Air Wing Cadet Equivalents */}
            <div style={{ background: '#FFFFFF', border: '1px solid var(--border)', padding: 18, borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow-card)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
                <NavyWingEmblem size={28} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--navy-900)' }}>
                    NAVAL & AIR WING SPECIALIST TITLES
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Tri-Service Equivalent Designations</div>
                </div>
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--navy-900)', lineHeight: 1.9 }}>
                <li><strong>Senior Cadet Captain (SCC)</strong> — Naval Equivalent of SUO</li>
                <li><strong>Cadet Captain (CC)</strong> — Naval Equivalent of UO</li>
                <li><strong>Cadet Warrant Officer (CWO)</strong> — Air Wing Equivalent of SUO</li>
                <li><strong>Leading Flight Cadet (LFC)</strong> — Air Wing Specialist Rank</li>
                <li><strong>Cadet Petty Officer (PO)</strong> — Naval Technical Rank</li>
                <li><strong>Leading Cadet</strong> — Naval Seamanship Cadet</li>
              </ul>
            </div>
          </div>
        </Panel>
      )}

      {/* =========================================================================
          MODAL 1: INTERACTIVE DIGITAL SYLLABUS & CHAPTER READER
          ========================================================================= */}
      {readingBook && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(5, 12, 24, 0.8)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 16,
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: 'var(--radius-sm)',
            width: '100%',
            maxWidth: 960,
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            overflow: 'hidden',
          }}>
            {/* Header Ribbon */}
            <div style={{
              background: 'linear-gradient(135deg, #06152B 0%, #13335F 100%)',
              color: '#FFFFFF',
              padding: '16px 24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '3px solid var(--ncc-gold)',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ fontSize: 32 }}>{readingBook.cover_icon || '📖'}</span>
                <div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 10, letterSpacing: '0.1em', color: 'var(--ncc-gold)', textTransform: 'uppercase', fontWeight: 800 }}>
                      OFFICIAL NCC DIGITAL READER
                    </span>
                    <span style={{ fontSize: 10, background: 'rgba(255,255,255,0.15)', padding: '1px 6px', borderRadius: 3 }}>
                      {readingBook.edition_year || '2026 Edition'}
                    </span>
                  </div>
                  <h3 style={{ fontSize: 18, color: '#FFFFFF', margin: '2px 0 0 0', fontWeight: 800 }}>
                    {readingBook.title}
                  </h3>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
                    Author: {readingBook.author} • Subject: {readingBook.subject}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {readingBook.file_url && (
                  <a
                    href={readingBook.file_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      background: 'rgba(255,255,255,0.15)',
                      color: '#FFFFFF',
                      fontSize: 12,
                      fontWeight: 700,
                      padding: '6px 12px',
                      borderRadius: 4,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <span>📄</span>
                    <span>Download PDF</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setReadingBook(null)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.15)',
                    border: 'none',
                    color: '#FFFFFF',
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    cursor: 'pointer',
                    fontSize: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Split Content Body: Chapter Index (Left) & Reading View (Right) */}
            <div style={{
              display: 'flex',
              flex: 1,
              overflow: 'hidden',
              minHeight: 460,
            }}>
              {/* Left Column: Chapters Navigation */}
              <div style={{
                width: 280,
                borderRight: '1px solid var(--border)',
                background: 'var(--bg-main)',
                display: 'flex',
                flexDirection: 'column',
                flexShrink: 0,
              }}>
                <div style={{
                  padding: '12px 16px',
                  fontWeight: 800,
                  fontSize: 12,
                  color: 'var(--navy-900)',
                  borderBottom: '1px solid var(--border)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  background: '#FFFFFF',
                }}>
                  Table of Contents ({readingBook.chapters?.length || 0})
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
                  {(readingBook.chapters || []).map((ch, idx) => {
                    const isActive = currentChapterIndex === idx;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCurrentChapterIndex(idx)}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '10px 12px',
                          borderRadius: 'var(--radius-xs)',
                          border: isActive ? '1px solid var(--navy-900)' : '1px solid transparent',
                          background: isActive ? '#FFFFFF' : 'transparent',
                          boxShadow: isActive ? 'var(--shadow-card)' : 'none',
                          cursor: 'pointer',
                          marginBottom: 4,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 2,
                        }}
                      >
                        <div style={{
                          fontSize: 11,
                          fontWeight: 800,
                          color: isActive ? 'var(--ncc-gold-dark)' : 'var(--text-muted)',
                        }}>
                          CHAPTER {ch.chapter_number || idx + 1}
                        </div>
                        <div style={{
                          fontSize: 12,
                          fontWeight: isActive ? 700 : 500,
                          color: isActive ? 'var(--navy-900)' : 'var(--text-body)',
                          lineHeight: 1.3,
                        }}>
                          {ch.title || `Chapter ${idx + 1}`}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Chapter Detailed Learning Content */}
              <div style={{
                flex: 1,
                padding: '24px 32px',
                overflowY: 'auto',
                background: '#FFFFFF',
              }}>
                {readingBook.chapters && readingBook.chapters[currentChapterIndex] ? (
                  <div>
                    {/* Chapter Header */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      marginBottom: 8,
                    }}>
                      <span className="badge badge-navy">
                        CHAPTER {readingBook.chapters[currentChapterIndex].chapter_number || currentChapterIndex + 1} OF {readingBook.chapters.length}
                      </span>
                      <span className="badge badge-olive">
                        {readingBook.subject}
                      </span>
                    </div>

                    <h2 style={{
                      fontSize: 22,
                      fontWeight: 800,
                      color: 'var(--navy-900)',
                      margin: '0 0 16px 0',
                    }}>
                      {readingBook.chapters[currentChapterIndex].title}
                    </h2>

                    {/* Summary / Syllabus Description */}
                    <div style={{
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '16px 20px',
                      marginBottom: 24,
                      fontSize: 14,
                      color: 'var(--text-body)',
                      lineHeight: 1.6,
                    }}>
                      <div style={{ fontWeight: 800, fontSize: 12, color: 'var(--navy-900)', textTransform: 'uppercase', marginBottom: 6 }}>
                        Syllabus Breakdown & Curriculum Content:
                      </div>
                      {readingBook.chapters[currentChapterIndex].content || 'Official curriculum outline according to DG NCC specifications.'}
                    </div>

                    {/* Key Points & Learning Outcomes Checklist */}
                    {Array.isArray(readingBook.chapters[currentChapterIndex].key_points) &&
                      readingBook.chapters[currentChapterIndex].key_points.length > 0 && (
                        <div>
                          <h4 style={{
                            fontSize: 14,
                            fontWeight: 800,
                            color: 'var(--navy-900)',
                            margin: '0 0 12px 0',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                          }}>
                            <span>🎯</span>
                            <span>Key Exam Facts & Essential Knowledge Points:</span>
                          </h4>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {readingBook.chapters[currentChapterIndex].key_points.map((pt, pIdx) => (
                              <div
                                key={pIdx}
                                style={{
                                  display: 'flex',
                                  alignItems: 'flex-start',
                                  gap: 12,
                                  background: 'linear-gradient(90deg, rgba(212,175,55,0.06), #FFFFFF)',
                                  border: '1px solid var(--border)',
                                  borderRadius: 'var(--radius-xs)',
                                  padding: '10px 14px',
                                }}
                              >
                                <span style={{
                                  color: 'var(--success)',
                                  fontWeight: 900,
                                  fontSize: 14,
                                  lineHeight: 1.2,
                                }}>
                                  ✓
                                </span>
                                <span style={{ fontSize: 13, color: 'var(--navy-900)', lineHeight: 1.5, fontWeight: 500 }}>
                                  {pt}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    {/* Chapter Pagination Navigation */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: 36,
                      paddingTop: 16,
                      borderTop: '1px solid var(--border)',
                    }}>
                      <button
                        type="button"
                        className="secondary"
                        disabled={currentChapterIndex === 0}
                        onClick={() => setCurrentChapterIndex(prev => Math.max(0, prev - 1))}
                        style={{ height: 36, fontSize: 12 }}
                      >
                        ← Previous Chapter
                      </button>

                      <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
                        {currentChapterIndex + 1} / {readingBook.chapters.length}
                      </span>

                      <button
                        type="button"
                        className="primary"
                        disabled={currentChapterIndex >= readingBook.chapters.length - 1}
                        onClick={() => setCurrentChapterIndex(prev => Math.min(readingBook.chapters.length - 1, prev + 1))}
                        style={{ height: 36, fontSize: 12 }}
                      >
                        Next Chapter →
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>
                    Select a chapter from the table of contents to read.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: ADMIN ADD / EDIT STUDY MATERIAL & SYLLABUS BOOK
          ========================================================================= */}
      {isEditModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(5, 12, 24, 0.8)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 16,
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: 'var(--radius-sm)',
            width: '100%',
            maxWidth: 780,
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            overflow: 'hidden',
          }}>
            {/* Modal Header */}
            <div style={{
              background: 'linear-gradient(135deg, #06152B 0%, #13335F 100%)',
              color: '#FFFFFF',
              padding: '16px 24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '3px solid var(--tiranga-saffron)',
              flexShrink: 0,
            }}>
              <div>
                <span style={{ fontSize: 10, letterSpacing: '0.12em', color: 'var(--tiranga-saffron)', textTransform: 'uppercase', fontWeight: 800 }}>
                  ADMINISTRATIVE CURRICULUM MANAGEMENT
                </span>
                <h3 style={{ fontSize: 18, color: '#FFFFFF', margin: '2px 0 0 0', fontWeight: 800 }}>
                  {editingBookId ? 'Edit Syllabus Book & Manual' : 'Add New NCC Syllabus Book / Manual'}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  border: 'none',
                  color: '#FFFFFF',
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontSize: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSaveBook} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
                {adminActionMsg && (
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-xs)',
                    marginBottom: 16,
                    fontSize: 13,
                    fontWeight: 700,
                    background: adminActionMsg.startsWith('✓') ? 'rgba(5, 150, 105, 0.12)' : 'rgba(220, 38, 38, 0.12)',
                    color: adminActionMsg.startsWith('✓') ? '#059669' : '#dc2626',
                  }}>
                    {adminActionMsg}
                  </div>
                )}

                {/* Primary Metadata */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 14 }}>
                  <div className="field">
                    <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy-900)' }}>Book / Manual Title *</label>
                    <input
                      type="text"
                      required
                      value={bookFormData.title}
                      onChange={(e) => setBookFormData({ ...bookFormData, title: e.target.value })}
                      placeholder="e.g. Cadet Handbook: Common Subjects"
                      style={{ height: 38, width: '100%', fontSize: 13 }}
                    />
                  </div>

                  <div className="field">
                    <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy-900)' }}>Subject / Discipline *</label>
                    <input
                      type="text"
                      required
                      value={bookFormData.subject}
                      onChange={(e) => setBookFormData({ ...bookFormData, subject: e.target.value })}
                      placeholder="e.g. Weapon Training, Foot Drill, Map Reading"
                      style={{ height: 38, width: '100%', fontSize: 13 }}
                    />
                  </div>
                </div>

                {/* Wing, Cert, Category */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14, marginBottom: 14 }}>
                  <div className="field">
                    <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy-900)' }}>Wing</label>
                    <select
                      value={bookFormData.wing}
                      onChange={(e) => setBookFormData({ ...bookFormData, wing: e.target.value })}
                      style={{ height: 38, width: '100%', fontSize: 13 }}
                    >
                      <option value="common">Common (All Wings)</option>
                      <option value="army">Army Wing</option>
                      <option value="navy">Naval Wing</option>
                      <option value="air">Air Wing</option>
                    </select>
                  </div>

                  <div className="field">
                    <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy-900)' }}>Certificate Level</label>
                    <select
                      value={bookFormData.certificate_level}
                      onChange={(e) => setBookFormData({ ...bookFormData, certificate_level: e.target.value })}
                      style={{ height: 38, width: '100%', fontSize: 13 }}
                    >
                      <option value="common">Common Core</option>
                      <option value="A">Certificate 'A'</option>
                      <option value="B">Certificate 'B'</option>
                      <option value="C">Certificate 'C'</option>
                      <option value="ALL">All Certificates (A/B/C)</option>
                    </select>
                  </div>

                  <div className="field">
                    <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy-900)' }}>Category</label>
                    <select
                      value={bookFormData.category}
                      onChange={(e) => setBookFormData({ ...bookFormData, category: e.target.value })}
                      style={{ height: 38, width: '100%', fontSize: 13 }}
                    >
                      <option value="handbook">Official Handbook</option>
                      <option value="core_syllabus">Core Syllabus</option>
                      <option value="specialized">Specialized Manual</option>
                      <option value="reference">Reference / Guide</option>
                    </select>
                  </div>

                  <div className="field">
                    <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy-900)' }}>Edition Year</label>
                    <input
                      type="text"
                      value={bookFormData.edition_year}
                      onChange={(e) => setBookFormData({ ...bookFormData, edition_year: e.target.value })}
                      placeholder="e.g. 2026 Edition"
                      style={{ height: 38, width: '100%', fontSize: 13 }}
                    />
                  </div>
                </div>

                {/* Author & File URL */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 14 }}>
                  <div className="field">
                    <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy-900)' }}>Author / Directorate</label>
                    <input
                      type="text"
                      value={bookFormData.author}
                      onChange={(e) => setBookFormData({ ...bookFormData, author: e.target.value })}
                      placeholder="e.g. Directorate General NCC, New Delhi"
                      style={{ height: 38, width: '100%', fontSize: 13 }}
                    />
                  </div>

                  <div className="field">
                    <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy-900)' }}>Official PDF / Document URL</label>
                    <input
                      type="url"
                      value={bookFormData.file_url}
                      onChange={(e) => setBookFormData({ ...bookFormData, file_url: e.target.value })}
                      placeholder="https://indiancc.nic.in/.../manual.pdf"
                      style={{ height: 38, width: '100%', fontSize: 13 }}
                    />
                  </div>
                </div>

                {/* Cover Icon Picker */}
                <div className="field" style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy-900)' }}>Cover Icon Badge</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                    {COVER_ICONS.map(icon => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setBookFormData({ ...bookFormData, cover_icon: icon })}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 6,
                          fontSize: 18,
                          border: bookFormData.cover_icon === icon ? '2px solid var(--navy-900)' : '1px solid var(--border)',
                          background: bookFormData.cover_icon === icon ? 'rgba(11,37,69,0.1)' : '#FFFFFF',
                          cursor: 'pointer',
                        }}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div className="field" style={{ marginBottom: 18 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy-900)' }}>Book Description & Syllabus Scope</label>
                  <textarea
                    rows={3}
                    value={bookFormData.description}
                    onChange={(e) => setBookFormData({ ...bookFormData, description: e.target.value })}
                    placeholder="Comprehensive handbook covering all required aspects of training..."
                    style={{ width: '100%', fontSize: 13, padding: 8 }}
                  />
                </div>

                {/* =================================================================
                    CHAPTERS MANAGER FOR THE BOOK
                    ================================================================= */}
                <div style={{
                  padding: 16,
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-main)',
                  marginBottom: 14,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--navy-900)' }}>
                        📑 Interactive Chapters & Content ({bookFormData.chapters.length})
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        Add chapters with syllabus outlines and key bullet points for cadet study.
                      </div>
                    </div>
                    <button
                      type="button"
                      className="secondary"
                      onClick={handleAddChapter}
                      style={{ height: 32, fontSize: 11, fontWeight: 700 }}
                    >
                      ➕ Add Chapter
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {bookFormData.chapters.map((ch, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: 12,
                          background: '#FFFFFF',
                          borderRadius: 'var(--radius-xs)',
                          border: '1px solid var(--border)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontWeight: 800, fontSize: 12, color: 'var(--navy-900)' }}>
                            Chapter {idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveChapter(idx)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#dc2626',
                              fontSize: 12,
                              cursor: 'pointer',
                              fontWeight: 700,
                            }}
                          >
                            ✕ Remove
                          </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginBottom: 8 }}>
                          <input
                            type="text"
                            required
                            placeholder="Chapter Title"
                            value={ch.title}
                            onChange={(e) => handleUpdateChapter(idx, 'title', e.target.value)}
                            style={{ height: 34, fontSize: 12 }}
                          />
                          <input
                            type="text"
                            placeholder="Chapter Summary / Syllabus coverage"
                            value={ch.content}
                            onChange={(e) => handleUpdateChapter(idx, 'content', e.target.value)}
                            style={{ height: 34, fontSize: 12 }}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                            Key Learning Points (One per line):
                          </label>
                          <textarea
                            rows={2}
                            placeholder="Point 1&#10;Point 2&#10;Point 3"
                            value={(ch.key_points || []).join('\n')}
                            onChange={(e) => handleUpdateChapterPoints(idx, e.target.value)}
                            style={{ width: '100%', fontSize: 12, padding: 6 }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modal Footer Controls */}
              <div style={{
                padding: '14px 24px',
                borderTop: '1px solid var(--border)',
                background: '#f8fafc',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 12,
                flexShrink: 0,
              }}>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={savingBook}
                  style={{ height: 38 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary"
                  disabled={savingBook}
                  style={{ height: 38, padding: '0 20px', fontWeight: 700 }}
                >
                  {savingBook ? 'Saving...' : editingBookId ? 'Update Study Material' : 'Publish Book to Library'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
