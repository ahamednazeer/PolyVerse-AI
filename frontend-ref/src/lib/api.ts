const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class ApiClient {
    private token: string | null = null;

    setToken(token: string) {
        this.token = token;
        if (typeof window !== 'undefined') {
            localStorage.setItem('token', token);
        }
    }

    getToken() {
        if (!this.token && typeof window !== 'undefined') {
            this.token = localStorage.getItem('token');
        }
        return this.token;
    }

    clearToken() {
        this.token = null;
        if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
        }
    }

    private async request(endpoint: string, options: RequestInit = {}) {
        const token = this.getToken();
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(options.headers as Record<string, string>),
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers,
            cache: 'no-store',
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Request failed' }));
            throw new Error(error.detail || error.message || 'Request failed');
        }

        return response.json();
    }

    // Auth
    async login(username: string, password: string) {
        const data = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
        });
        this.setToken(data.access_token);
        return data;
    }

    async getMe() {
        return this.request('/auth/me');
    }

    // Users
    async getUsers() {
        return this.request('/users');
    }

    async createUser(userData: any) {
        return this.request('/users', {
            method: 'POST',
            body: JSON.stringify(userData),
        });
    }

    async updateUser(id: number, userData: any) {
        return this.request(`/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(userData),
        });
    }

    async deleteUser(id: number) {
        return this.request(`/users/${id}`, {
            method: 'DELETE',
        });
    }

    async bulkImportUsers(users: any[]) {
        return this.request('/users/bulk-import', {
            method: 'POST',
            body: JSON.stringify({ users }),
        });
    }

    // PDFs
    async getPDFs() {
        return this.request('/pdfs');
    }

    async uploadPDF(formData: FormData) {
        const token = this.getToken();
        const headers: Record<string, string> = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_URL}/pdfs`, {
            method: 'POST',
            headers,
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
            throw new Error(error.detail || 'Upload failed');
        }

        return response.json();
    }

    async uploadFile(file: File) {
        const token = this.getToken();
        const headers: Record<string, string> = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_URL}/uploads`, {
            method: 'POST',
            headers,
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
            throw new Error(error.detail || 'Upload failed');
        }

        return response.json();
    }

    async getPDF(id: number) {
        return this.request(`/pdfs/${id}`);
    }

    async updatePDF(id: number, data: any) {
        return this.request(`/pdfs/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async publishPDF(id: number) {
        return this.request(`/pdfs/${id}/publish`, {
            method: 'POST',
        });
    }

    async deletePDF(id: number) {
        return this.request(`/pdfs/${id}`, {
            method: 'DELETE',
        });
    }

    async assignPDF(pdfId: number, data: { student_ids?: number[]; batch?: string }) {
        return this.request(`/pdfs/${pdfId}/assign`, {
            method: 'POST',
            body: JSON.stringify({ ...data, pdf_id: pdfId }),
        });
    }

    async getMyAssignments() {
        return this.request('/pdfs/student/assignments');
    }

    getPDFDownloadUrl(id: number) {
        return `${API_URL}/pdfs/${id}/download`;
    }

    async getPDFBlob(id: number): Promise<string> {
        const token = this.getToken();
        const headers: Record<string, string> = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_URL}/pdfs/${id}/download`, {
            headers,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Failed to load PDF' }));
            throw new Error(error.detail || 'Failed to load PDF');
        }

        const blob = await response.blob();
        return URL.createObjectURL(blob);
    }

    // Reading
    async startReadingSession(pdfId: number) {
        return this.request('/reading/session/start', {
            method: 'POST',
            body: JSON.stringify({ pdf_id: pdfId }),
        });
    }

    async pauseReadingSession(sessionId: number) {
        return this.request(`/reading/session/${sessionId}/pause`, {
            method: 'POST',
        });
    }

    async resumeReadingSession(sessionId: number) {
        return this.request(`/reading/session/${sessionId}/resume`, {
            method: 'POST',
        });
    }

    async endReadingSession(sessionId: number, finalDelta: number = 0) {
        return this.request(`/reading/session/${sessionId}/end`, {
            method: 'POST',
            body: JSON.stringify({ final_delta_seconds: finalDelta }),
        });
    }

    async heartbeatReadingSession(sessionId: number, deltaSeconds: number) {
        return this.request(`/reading/session/${sessionId}/heartbeat`, {
            method: 'POST',
            body: JSON.stringify({ delta_seconds: deltaSeconds }),
        });
    }

    async getReadingProgress(pdfId: number) {
        return this.request(`/reading/progress/${pdfId}`);
    }

    async getReadingHistory(pdfId: number) {
        return this.request(`/reading/history/${pdfId}`);
    }

    // COMMENTED OUT - Reading Streak feature disabled
    // // Streaks
    // async getStreak(pdfId: number) {
    //     return this.request(`/streaks/${pdfId}`);
    // }
    //
    // async getStreakDashboard(pdfId: number) {
    //     return this.request(`/streaks/${pdfId}/dashboard`);
    // }
    //
    // async requestRecovery(streakId: number, reason: string) {
    //     return this.request('/streaks/recovery', {
    //         method: 'POST',
    //         body: JSON.stringify({ streak_id: streakId, reason }),
    //     });
    // }
    //
    // async getStreakAnalytics() {
    //     return this.request('/streaks/admin/analytics');
    // }
    //
    // async getPendingRecoveryRequests() {
    //     return this.request('/streaks/admin/recovery-requests');
    // }
    //
    // async reviewRecoveryRequest(requestId: number, status: string, adminNotes?: string) {
    //     return this.request(`/streaks/admin/recovery-requests/${requestId}/review`, {
    //         method: 'POST',
    //         body: JSON.stringify({ status, admin_notes: adminNotes }),
    //     });
    // }

    // Quizzes
    async getQuizzes(pdfId: number) {
        return this.request(`/quizzes/pdf/${pdfId}`);
    }

    async createQuiz(data: any) {
        return this.request('/quizzes', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async generateQuiz(pdfId: number, numQuestions: number = 5, title?: string) {
        return this.request('/quizzes/generate', {
            method: 'POST',
            body: JSON.stringify({
                pdf_id: pdfId,
                num_questions: numQuestions,
                title: title
            }),
        });
    }

    async getQuiz(id: number) {
        return this.request(`/quizzes/${id}`);
    }

    async getQuizForStudent(id: number) {
        return this.request(`/quizzes/${id}/student`);
    }

    async updateQuiz(id: number, data: any) {
        return this.request(`/quizzes/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async publishQuiz(id: number) {
        return this.request(`/quizzes/${id}/publish`, {
            method: 'POST',
        });
    }

    async deleteQuiz(id: number) {
        return this.request(`/quizzes/${id}`, {
            method: 'DELETE',
        });
    }

    async getAllQuizResults() {
        return this.request('/quizzes/admin/results');
    }

    async getQuizResults(quizId: number) {
        return this.request(`/quizzes/admin/results/${quizId}`);
    }

    async startQuizAttempt(quizId: number) {
        return this.request(`/quizzes/${quizId}/start`, {
            method: 'POST',
        });
    }

    async submitQuizAttempt(quizId: number, answers: Record<string, number>) {
        return this.request('/quizzes/submit', {
            method: 'POST',
            body: JSON.stringify({ quiz_id: quizId, answers }),
        });
    }

    async getMyAttempts() {
        return this.request('/quizzes/my/attempts');
    }

    // Admin
    async getSystemStats() {
        return this.request('/admin/stats');
    }

    async getAuditLogs() {
        return this.request('/admin/audit-logs');
    }

    // ============== Attendance ==============

    // Student - Profile Photo
    async uploadProfilePhoto(file: File) {
        const formData = new FormData();
        formData.append('file', file);

        const token = this.getToken();
        const headers: Record<string, string> = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_URL}/attendance/profile-photo`, {
            method: 'POST',
            headers,
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
            throw new Error(error.detail || 'Upload failed');
        }

        return response.json();
    }

    async getProfilePhotoStatus() {
        return this.request('/attendance/profile-photo/status');
    }

    // Student - Attendance
    async getAttendancePreCheck() {
        return this.request('/attendance/pre-check');
    }

    async markAttendance(file: File, latitude: number, longitude: number, accuracy: number) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('latitude', latitude.toString());
        formData.append('longitude', longitude.toString());
        formData.append('accuracy', accuracy.toString());

        const token = this.getToken();
        const headers: Record<string, string> = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_URL}/attendance/mark`, {
            method: 'POST',
            headers,
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Attendance marking failed' }));
            throw new Error(error.detail || 'Attendance marking failed');
        }

        return response.json();
    }

    async getTodayAttendance() {
        return this.request('/attendance/today');
    }

    async getAttendanceHistory(startDate?: string, endDate?: string) {
        let url = '/attendance/history';
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        if (params.toString()) url += `?${params.toString()}`;
        return this.request(url);
    }

    async getAttendanceAttempts() {
        return this.request('/attendance/attempts');
    }

    // Admin - Attendance
    async getPendingProfilePhotos(skip = 0, limit = 50) {
        return this.request(`/admin/attendance/profile-photos/pending?skip=${skip}&limit=${limit}`);
    }

    async reviewProfilePhoto(photoId: number, approved: boolean, rejectionReason?: string) {
        return this.request(`/admin/attendance/profile-photos/${photoId}/review`, {
            method: 'POST',
            body: JSON.stringify({ approved, rejection_reason: rejectionReason }),
        });
    }

    // Admin - Geofences
    async createGeofence(data: {
        name: string;
        description?: string;
        latitude: number;
        longitude: number;
        radius_meters?: number;
        accuracy_threshold?: number;
        is_primary?: boolean;
    }) {
        return this.request('/admin/attendance/geofences', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async getGeofences() {
        return this.request('/admin/attendance/geofences');
    }

    async updateGeofence(id: number, data: any) {
        return this.request(`/admin/attendance/geofences/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteGeofence(id: number) {
        return this.request(`/admin/attendance/geofences/${id}`, {
            method: 'DELETE',
        });
    }

    // Admin - Attendance Windows
    async createAttendanceWindow(data: {
        name: string;
        start_time: string;
        end_time: string;
        days_of_week?: number[];
        student_category?: string;
    }) {
        return this.request('/admin/attendance/windows', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async getAttendanceWindows() {
        return this.request('/admin/attendance/windows');
    }

    async deleteAttendanceWindow(id: number) {
        return this.request(`/admin/attendance/windows/${id}`, {
            method: 'DELETE',
        });
    }

    // Admin - Dashboard
    async getAttendanceDashboard(targetDate?: string) {
        let url = '/admin/attendance/dashboard';
        if (targetDate) url += `?target_date=${targetDate}`;
        return this.request(url);
    }

    async getAttendanceRecords(targetDate?: string) {
        let url = '/admin/attendance/records';
        if (targetDate) url += `?target_date=${targetDate}`;
        return this.request(url);
    }

    async getFailedAttempts(startDate?: string, endDate?: string) {
        let url = '/admin/attendance/failed-attempts';
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        if (params.toString()) url += `?${params.toString()}`;
        return this.request(url);
    }

    // Admin - Detailed student-by-student attendance
    async getDetailedAttendance(targetDate?: string) {
        let url = '/admin/attendance/detailed';
        if (targetDate) url += `?target_date=${targetDate}`;
        return this.request(url);
    }

    // Student - Get my attendance stats
    async getMyAttendanceStats(startDate?: string, endDate?: string) {
        let url = '/attendance/stats';
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        if (params.toString()) url += `?${params.toString()}`;
        return this.request(url);
    }

    // Admin - Holidays/Calendar Management
    async createHoliday(data: { date: string; name: string; description?: string; holiday_type?: string; is_recurring?: boolean }) {
        return this.request('/admin/attendance/holidays', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async getHolidays(startDate?: string, endDate?: string) {
        let url = '/admin/attendance/holidays';
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        if (params.toString()) url += `?${params.toString()}`;
        return this.request(url);
    }

    async deleteHoliday(holidayId: number) {
        return this.request(`/admin/attendance/holidays/${holidayId}`, {
            method: 'DELETE',
        });
    }

    async bulkCreateHolidays(text: string, year: number) {
        return this.request('/admin/attendance/holidays/bulk', {
            method: 'POST',
            body: JSON.stringify({ text, year }),
        });
    }

    // Admin - Academic Year Settings
    async getAcademicYearSettings() {
        return this.request('/admin/attendance/settings/academic-year');
    }

    async updateAcademicYearSettings(startDate: string, endDate: string) {
        return this.request('/admin/attendance/settings/academic-year', {
            method: 'PUT',
            body: JSON.stringify({ start_date: startDate, end_date: endDate }),
        });
    }

    // ============== Hostel Services ==============

    // Student - Hostel Info
    async getMyHostelInfo() {
        return this.request('/outpass/hostel-info');
    }

    // Student - Outpass
    async createOutpass(data: {
        reason: string;
        destination: string;
        start_datetime: string;
        end_datetime: string;
        emergency_contact: string;
    }) {
        return this.request('/outpass', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async getMyOutpasses(status?: string, page: number = 1, pageSize: number = 20) {
        let url = `/outpass?page=${page}&page_size=${pageSize}`;
        if (status) url += `&status=${status}`;
        return this.request(url);
    }

    async getOutpassSummary() {
        return this.request('/outpass/summary');
    }

    async getOutpass(id: number) {
        return this.request(`/outpass/${id}`);
    }

    // Warden - Hostel Management
    async getWardenHostel() {
        return this.request('/warden/hostel');
    }

    async getWardenStudents() {
        return this.request('/warden/students');
    }

    async getPendingOutpasses(page: number = 1, pageSize: number = 20) {
        return this.request(`/warden/outpass/pending?page=${page}&page_size=${pageSize}`);
    }

    async getAllHostelOutpasses(status?: string, page: number = 1, pageSize: number = 20) {
        let url = `/warden/outpass/all?page=${page}&page_size=${pageSize}`;
        if (status) url += `&status=${status}`;
        return this.request(url);
    }

    async getStudentOutpassHistory(studentId: number) {
        return this.request(`/warden/outpass/student/${studentId}`);
    }

    async getApprovedOutpasses(page: number = 1, pageSize: number = 100) {
        return this.request(`/warden/outpass/all?status=APPROVED&page=${page}&page_size=${pageSize}`);
    }

    async approveOutpass(outpassId: number) {
        return this.request(`/warden/outpass/${outpassId}/approve`, {
            method: 'POST',
        });
    }

    async rejectOutpass(outpassId: number, rejectionReason: string) {
        return this.request(`/warden/outpass/${outpassId}/reject`, {
            method: 'POST',
            body: JSON.stringify({ rejection_reason: rejectionReason }),
        });
    }

    // Admin - Hostel CRUD
    async createHostel(data: { name: string; address?: string; capacity?: number }) {
        return this.request('/admin/hostels', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async getHostels(includeInactive: boolean = false) {
        return this.request(`/admin/hostels?include_inactive=${includeInactive}`);
    }

    async getHostel(id: number) {
        return this.request(`/admin/hostels/${id}`);
    }

    async updateHostel(id: number, data: any) {
        return this.request(`/admin/hostels/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async assignWarden(hostelId: number, wardenId: number) {
        return this.request(`/admin/hostels/${hostelId}/assign-warden?warden_id=${wardenId}`, {
            method: 'POST',
        });
    }

    async removeWarden(hostelId: number) {
        return this.request(`/admin/hostels/${hostelId}/remove-warden`, {
            method: 'DELETE',
        });
    }

    async getHostelRooms(hostelId: number, includeInactive: boolean = false) {
        return this.request(`/admin/hostels/${hostelId}/rooms?include_inactive=${includeInactive}`);
    }

    async addHostelRoom(hostelId: number, data: { room_number: string; floor?: number; capacity?: number }) {
        return this.request(`/admin/hostels/${hostelId}/rooms`, {
            method: 'POST',
            body: JSON.stringify({ ...data, hostel_id: hostelId }),
        });
    }

    async updateHostelRoom(roomId: number, data: any) {
        return this.request(`/admin/hostels/rooms/${roomId}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async assignStudentToHostel(data: { student_id: number; hostel_id: number; room_id: number }) {
        return this.request('/admin/hostels/assignments', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async removeStudentAssignment(studentId: number) {
        return this.request(`/admin/hostels/assignments/${studentId}`, {
            method: 'DELETE',
        });
    }

    async getHostelStudents(hostelId: number) {
        return this.request(`/admin/hostels/${hostelId}/students`);
    }

    // ============ Bonafide Certificate APIs ============

    // Student - Request certificate
    async requestCertificate(data: {
        certificate_type: string;
        purpose: string;
        purpose_details?: string;
    }) {
        return this.request('/certificates/request', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    // Student - Get my certificates
    async getMyCertificates(page: number = 1, pageSize: number = 20) {
        return this.request(`/certificates/my-requests?page=${page}&page_size=${pageSize}`);
    }

    // Student - Get my certificate summary
    async getMyCertificateSummary() {
        return this.request('/certificates/my-summary');
    }

    // Student - Get certificate by ID
    async getCertificate(certificateId: number) {
        return this.request(`/certificates/${certificateId}`);
    }

    // Student - Download approved certificate
    async downloadCertificate(certificateId: number) {
        return this.request(`/certificates/${certificateId}/download`, {
            method: 'POST',
        });
    }

    // Warden - Get pending certificates
    async getPendingCertificates() {
        return this.request('/certificates/warden/pending');
    }

    // Warden - Get all hostel certificates
    async getAllCertificates(status?: string, page: number = 1, pageSize: number = 20) {
        let url = `/certificates/warden/all?page=${page}&page_size=${pageSize}`;
        if (status) url += `&status=${status}`;
        return this.request(url);
    }

    // Warden - Approve certificate
    async approveCertificate(certificateId: number) {
        return this.request(`/certificates/warden/${certificateId}/approve`, {
            method: 'POST',
        });
    }

    // Warden - Reject certificate
    async rejectCertificate(certificateId: number, rejectionReason: string) {
        return this.request(`/certificates/warden/${certificateId}/reject`, {
            method: 'POST',
            body: JSON.stringify({
                approved: false,
                rejection_reason: rejectionReason,
            }),
        });
    }

    // Admin - Get pending certificates (general bonafide)
    async getAdminPendingCertificates() {
        return this.request('/certificates/admin/pending');
    }

    // Admin - Approve certificate
    async adminApproveCertificate(certificateId: number) {
        return this.request(`/certificates/admin/${certificateId}/approve`, {
            method: 'POST',
        });
    }

    // Admin - Reject certificate
    async adminRejectCertificate(certificateId: number, rejectionReason: string) {
        return this.request(`/certificates/admin/${certificateId}/reject`, {
            method: 'POST',
            body: JSON.stringify({
                approved: false,
                rejection_reason: rejectionReason,
            }),
        });
    }

    // ============ QUERIES ============

    // Student - Create query
    async createQuery(data: { description: string; category?: string | null }) {
        return this.request('/queries', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    // Student - Get my queries
    async getMyQueries() {
        return this.request('/queries/my');
    }

    // Admin - Get pending queries
    async getPendingQueries() {
        return this.request('/queries/pending');
    }

    // Admin - Get resolved queries (history)
    async getAdminResolvedQueries() {
        return this.request('/queries/admin/resolved');
    }

    // Admin - Get AI suggestion for query
    async getQuerySuggestion(queryId: number) {
        return this.request(`/queries/${queryId}/suggest`);
    }

    // Admin - Respond to query
    async respondToQuery(queryId: number, response: string) {
        return this.request(`/queries/${queryId}/respond`, {
            method: 'POST',
            body: JSON.stringify({ response }),
        });
    }

    // Warden - Get pending hosteller queries
    async getWardenPendingQueries() {
        return this.request('/queries/warden/pending');
    }

    // Warden - Get resolved hosteller queries (history)
    async getWardenResolvedQueries() {
        return this.request('/queries/warden/resolved');
    }

    // ============ COMPLAINTS ============

    // Student - Create complaint
    async createComplaint(data: { location: string; description: string; category?: string | null }) {
        return this.request('/complaints', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    // Student - Get my complaints
    async getMyComplaints() {
        return this.request('/complaints/my');
    }

    // Admin - Get pending complaints
    async getPendingComplaints() {
        return this.request('/complaints/pending');
    }

    // Admin - Get resolved complaints
    async getAdminResolvedComplaints() {
        return this.request('/complaints/admin/resolved');
    }

    // Warden - Get pending complaints
    async getWardenPendingComplaints() {
        return this.request('/complaints/warden/pending');
    }

    // Warden - Get resolved complaints
    async getWardenResolvedComplaints() {
        return this.request('/complaints/warden/resolved');
    }

    // Admin/Warden - Verify complaint
    async verifyComplaint(id: number, assignedTo?: string) {
        return this.request(`/complaints/${id}/verify`, {
            method: 'POST',
            body: JSON.stringify({ assigned_to: assignedTo }),
        });
    }

    // Admin/Warden - Reject complaint
    async rejectComplaint(id: number, reason: string) {
        return this.request(`/complaints/${id}/reject`, {
            method: 'POST',
            body: JSON.stringify({ reason }),
        });
    }

    // Admin/Warden - Assign staff
    async assignComplaintStaff(id: number, staffName: string) {
        return this.request(`/complaints/${id}/assign`, {
            method: 'POST',
            body: JSON.stringify({ staff_name: staffName }),
        });
    }

    // Admin/Warden - Close complaint
    async closeComplaint(id: number, resolutionNotes?: string) {
        return this.request(`/complaints/${id}/close`, {
            method: 'POST',
            body: JSON.stringify({ resolution_notes: resolutionNotes }),
        });
    }

    // AI suggest resolution notes
    async suggestResolutionNotes(id: number): Promise<{ suggested_notes: string }> {
        return this.request(`/complaints/${id}/suggest-resolution`, {
            method: 'POST',
        });
    }

    // ============ AI ASSISTANT ============

    // AI Chat - Send a message to AI Assistant
    async aiChat(message: string, module: string = 'dashboard', pdfId?: number, context?: string, history: any[] = []) {
        return this.request('/ai/chat', {
            method: 'POST',
            body: JSON.stringify({
                message,
                module,
                pdf_id: pdfId,
                context,
                history: history.map(m => ({ role: m.role, content: m.content }))
            }),
        });
    }

    // AI Context - Check if AI is available for a module
    async getAIContext(module: string, pdfId?: number) {
        let url = `/ai/context/${module}`;
        if (pdfId) url += `?pdf_id=${pdfId}`;
        return this.request(url);
    }

    // AI Quiz Status - Check if user has active quiz (AI should be blocked)
    async getAIQuizStatus() {
        return this.request('/ai/quiz-status');
    }

    // AI Explain PDF - Ask AI to explain PDF content
    async aiExplainPDF(pdfId: number, question: string) {
        return this.request(`/ai/explain-pdf?pdf_id=${pdfId}&question=${encodeURIComponent(question)}`, {
            method: 'POST',
        });
    }

    // AI Classify Intent - Detect if message is query, complaint, or general
    async aiClassifyIntent(message: string) {
        return this.request(`/ai/classify-intent?message=${encodeURIComponent(message)}`, {
            method: 'POST',
        });
    }

    // AI STT - Transcribe audio blob to text
    async aiTranscribeAudio(audioBlob: Blob): Promise<{ text: string }> {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');

        const token = this.getToken();
        const headers: Record<string, string> = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_URL}/ai/stt`, {
            method: 'POST',
            headers,
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Transcription failed' }));
            throw new Error(error.detail || 'Transcription failed');
        }

        return response.json();
    }

    // ============ FACULTY LOCATION & AVAILABILITY ============

    // Get campus buildings (available to all users)
    async getCampusBuildings() {
        return this.request('/faculty-location/buildings');
    }

    // Faculty - Get own settings
    async getFacultySettings() {
        return this.request('/faculty-location/settings');
    }

    // Faculty - Update settings
    async updateFacultySettings(data: {
        is_sharing_enabled?: boolean;
        availability_status?: 'AVAILABLE' | 'BUSY' | 'OFFLINE';
        visibility_level?: 'ALL_STUDENTS' | 'SAME_DEPARTMENT' | 'ADMIN_ONLY' | 'HIDDEN';
        status_message?: string | null;
    }) {
        return this.request('/faculty-location/settings', {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    // Faculty - Refresh location
    async refreshFacultyLocation(buildingId: number, floor?: number) {
        return this.request('/faculty-location/refresh', {
            method: 'POST',
            body: JSON.stringify({ building_id: buildingId, floor }),
        });
    }

    // Student - Get available faculty list
    async getAvailableFaculty(params?: {
        search?: string;
        department?: string;
        page?: number;
        page_size?: number;
    }) {
        let url = '/faculty-location/faculty';
        const searchParams = new URLSearchParams();
        if (params?.search) searchParams.append('search', params.search);
        if (params?.department) searchParams.append('department', params.department);
        if (params?.page) searchParams.append('page', params.page.toString());
        if (params?.page_size) searchParams.append('page_size', params.page_size.toString());
        if (searchParams.toString()) url += `?${searchParams.toString()}`;
        return this.request(url);
    }

    // Student - Get specific faculty info
    async getFacultyById(facultyId: number) {
        return this.request(`/faculty-location/faculty/${facultyId}`);
    }

    // Get faculty departments (for filtering)
    async getFacultyDepartments() {
        return this.request('/faculty-location/departments');
    }

    // Admin - Get all faculty with settings
    async getAllFacultyAdmin() {
        return this.request('/faculty-location/admin/all');
    }

    // Admin - Get faculty stats
    async getFacultyStats() {
        return this.request('/faculty-location/admin/stats');
    }

    // Admin - Create campus building
    async createCampusBuilding(data: {
        name: string;
        code: string;
        description?: string;
        floor_count?: number;
    }) {
        return this.request('/faculty-location/admin/buildings', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    // Admin - Update campus building
    async updateCampusBuilding(buildingId: number, data: {
        name?: string;
        code?: string;
        description?: string;
        floor_count?: number;
        is_active?: boolean;
    }) {
        return this.request(`/faculty-location/admin/buildings/${buildingId}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    // Admin - Delete campus building
    async deleteCampusBuilding(buildingId: number) {
        return this.request(`/faculty-location/admin/buildings/${buildingId}`, {
            method: 'DELETE',
        });
    }

    // ============== HYBRID LEARNING MODULE ==============

    // Courses
    async getCourses(department?: string, semester?: number) {
        const params = new URLSearchParams();
        if (department) params.append('department', department);
        if (semester) params.append('semester', semester.toString());
        return this.request(`/courses?${params.toString()}`);
    }

    async getCourse(courseId: number) {
        return this.request(`/courses/${courseId}`);
    }

    async getMyCourses() {
        return this.request('/courses/my/enrolled');
    }

    async createCourse(data: { code: string; name: string; description?: string; department?: string; semester?: number; credits?: number }) {
        return this.request('/courses', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async enrollStudents(courseId: number, studentIds: number[], academicYear?: string) {
        return this.request(`/courses/${courseId}/enroll`, {
            method: 'POST',
            body: JSON.stringify({ student_ids: studentIds, academic_year: academicYear }),
        });
    }

    async getEnrollableStudents(department?: string) {
        const params = new URLSearchParams();
        if (department) params.append('department', department);
        const query = params.toString() ? `?${params.toString()}` : '';
        return this.request(`/courses/enrollable/students${query}`);
    }

    // Study Circles
    async getMyStudyCircles() {
        return this.request('/study-circles');
    }

    async getStudyCircle(circleId: number) {
        return this.request(`/study-circles/${circleId}`);
    }

    async createStudyCircle(data: { name: string; description?: string; course_id?: number; subject_code?: string; has_voice_room?: boolean }) {
        return this.request('/study-circles', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateStudyCircle(circleId: number, data: { name?: string; description?: string; course_id?: number; subject_code?: string; has_voice_room?: boolean; is_active?: boolean }) {
        return this.request(`/study-circles/${circleId}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteStudyCircle(circleId: number) {
        return this.request(`/study-circles/${circleId}`, {
            method: 'DELETE',
        });
    }

    async getAllStudyCircles() {
        return this.request('/study-circles/all');
    }

    async autoEnrollCircles() {
        return this.request('/study-circles/auto-enroll', { method: 'POST' });
    }

    async getCircleChannels(circleId: number) {
        return this.request(`/study-circles/${circleId}/channels`);
    }

    async getChannelMessages(circleId: number, channelId: number, limit: number = 50, beforeId?: number) {
        const params = new URLSearchParams({ limit: limit.toString() });
        if (beforeId) params.append('before_id', beforeId.toString());
        return this.request(`/study-circles/${circleId}/channels/${channelId}/messages?${params.toString()}`);
    }

    async postMessage(circleId: number, channelId: number, content: string, parentId?: number) {
        return this.request(`/study-circles/${circleId}/channels/${channelId}/messages`, {
            method: 'POST',
            body: JSON.stringify({ content, parent_id: parentId }),
        });
    }

    async pinMessage(circleId: number, messageId: number) {
        return this.request(`/study-circles/${circleId}/messages/${messageId}/pin`, { method: 'POST' });
    }

    async deleteMessage(circleId: number, messageId: number) {
        return this.request(`/study-circles/${circleId}/messages/${messageId}`, { method: 'DELETE' });
    }

    async getCircleMembers(circleId: number) {
        return this.request(`/study-circles/${circleId}/members`);
    }

    async searchCircleMessages(circleId: number, query: string) {
        return this.request(`/study-circles/${circleId}/search?q=${encodeURIComponent(query)}`);
    }

    // Flashcard Battles
    async getFlashcardSets(courseId?: number, topic?: string) {
        const params = new URLSearchParams();
        if (courseId) params.append('course_id', courseId.toString());
        if (topic) params.append('topic', topic);
        return this.request(`/flashcards/sets?${params.toString()}`);
    }

    async getFlashcardSet(setId: number) {
        return this.request(`/flashcards/sets/${setId}`);
    }

    async getFlashcards(setId: number) {
        return this.request(`/flashcards/sets/${setId}/cards`);
    }

    async createFlashcardSet(data: { title: string; description?: string; course_id?: number; subject_code?: string; topic?: string }) {
        return this.request('/flashcards/sets', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async addFlashcard(setId: number, data: { question: string; answer: string; hint?: string; options?: string[]; correct_option?: number; difficulty?: number }) {
        return this.request(`/flashcards/sets/${setId}/cards`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async generateFlashcardsFromTopic(topic: string, options?: { subject_code?: string; num_cards?: number; difficulty?: string; auto_publish?: boolean }) {
        return this.request('/flashcards/generate-from-topic', {
            method: 'POST',
            body: JSON.stringify({
                topic,
                subject_code: options?.subject_code,
                num_cards: options?.num_cards || 10,
                difficulty: options?.difficulty || 'medium',
                auto_publish: options?.auto_publish ?? true,
            }),
        });
    }

    async createBattle(setId: number, battleType: string = 'PUBLIC', numQuestions: number = 10) {
        return this.request('/flashcards/battles', {
            method: 'POST',
            body: JSON.stringify({ set_id: setId, battle_type: battleType, num_questions: numQuestions }),
        });
    }

    async findRandomBattle(setId?: number) {
        const params = setId ? `?set_id=${setId}` : '';
        return this.request(`/flashcards/battles/find-random${params}`);
    }

    async joinBattle(battleId: number) {
        return this.request(`/flashcards/battles/${battleId}/join`, { method: 'POST' });
    }

    async startBattle(battleId: number) {
        return this.request(`/flashcards/battles/${battleId}/start`, { method: 'POST' });
    }

    async getBattle(battleId: number) {
        return this.request(`/flashcards/battles/${battleId}`);
    }

    async getBattleQuestion(battleId: number, index: number) {
        return this.request(`/flashcards/battles/${battleId}/question/${index}`);
    }

    async submitBattleAnswer(battleId: number, questionIndex: number, answer: number, timeMs: number) {
        return this.request(`/flashcards/battles/${battleId}/answer`, {
            method: 'POST',
            body: JSON.stringify({ question_index: questionIndex, answer, time_ms: timeMs }),
        });
    }

    async endBattle(battleId: number) {
        return this.request(`/flashcards/battles/${battleId}/end`, { method: 'POST' });
    }

    async getFlashcardLeaderboard(period: string = 'WEEKLY') {
        return this.request(`/flashcards/leaderboard?period=${period}`);
    }

    async getMyFlashcardStats() {
        return this.request('/flashcards/my-stats');
    }

    // Doubt Sessions
    async getUpcomingDoubtSessions(courseId?: number) {
        const params = courseId ? `?course_id=${courseId}` : '';
        return this.request(`/doubt-sessions/upcoming${params}`);
    }

    async getLiveDoubtSessions() {
        return this.request('/doubt-sessions/live');
    }

    async getAllDoubtSessions(includeEnded: boolean = false) {
        return this.request(`/doubt-sessions?include_ended=${includeEnded}`);
    }

    async getMyDoubtSessions(includePast: boolean = false) {
        return this.request(`/doubt-sessions/my-sessions?include_past=${includePast}`);
    }

    async getDoubtSession(sessionId: number) {
        return this.request(`/doubt-sessions/${sessionId}`);
    }

    async createDoubtSession(data: { title: string; description?: string; course_id?: number; scheduled_at: string; duration_minutes?: number }) {
        return this.request('/doubt-sessions', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async joinDoubtSession(sessionId: number) {
        return this.request(`/doubt-sessions/${sessionId}/join`, { method: 'POST' });
    }

    async leaveDoubtSession(sessionId: number) {
        return this.request(`/doubt-sessions/${sessionId}/leave`, { method: 'POST' });
    }

    async askQuestion(sessionId: number, questionText: string) {
        return this.request(`/doubt-sessions/${sessionId}/questions`, {
            method: 'POST',
            body: JSON.stringify({ question_text: questionText }),
        });
    }

    async startDoubtSession(sessionId: number) {
        return this.request(`/doubt-sessions/${sessionId}/start`, { method: 'POST' });
    }

    async endDoubtSession(sessionId: number) {
        return this.request(`/doubt-sessions/${sessionId}/end`, { method: 'POST' });
    }

    async updateDoubtSession(sessionId: number, data: { title?: string; description?: string; course_id?: number; scheduled_at?: string; duration_minutes?: number }) {
        return this.request(`/doubt-sessions/${sessionId}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteDoubtSession(sessionId: number) {
        return this.request(`/doubt-sessions/${sessionId}`, { method: 'DELETE' });
    }

    async getSessionSummary(sessionId: number) {
        return this.request(`/doubt-sessions/${sessionId}/summary`);
    }

    // Collaborative Whiteboard
    async getActiveWhiteboards(courseId?: number) {
        const params = courseId ? `?course_id=${courseId}` : '';
        return this.request(`/whiteboard/active${params}`);
    }

    async getClosedWhiteboards(courseId?: number, topic?: string) {
        const params = new URLSearchParams();
        if (courseId) params.append('course_id', courseId.toString());
        if (topic) params.append('topic', topic);
        return this.request(`/whiteboard/closed?${params.toString()}`);
    }

    async getWhiteboard(sessionId: number) {
        return this.request(`/whiteboard/${sessionId}`);
    }

    async getWhiteboardCanvas(sessionId: number) {
        return this.request(`/whiteboard/${sessionId}/canvas`);
    }

    async createWhiteboard(data: { title: string; description?: string; course_id?: number; topic?: string; enable_voice?: boolean }) {
        return this.request('/whiteboard', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async inviteToWhiteboard(sessionId: number, userId: number, permission: string = 'DRAW') {
        return this.request(`/whiteboard/${sessionId}/invite`, {
            method: 'POST',
            body: JSON.stringify({ user_id: userId, permission }),
        });
    }

    async saveWhiteboardSnapshot(sessionId: number, canvasData: object, name?: string) {
        return this.request(`/whiteboard/${sessionId}/snapshots`, {
            method: 'POST',
            body: JSON.stringify({ canvas_data: canvasData, name }),
        });
    }

    async getWhiteboardSnapshots(sessionId: number) {
        return this.request(`/whiteboard/${sessionId}/snapshots`);
    }

    async closeWhiteboard(sessionId: number, finalCanvas?: object) {
        return this.request(`/whiteboard/${sessionId}/close`, {
            method: 'POST',
            body: JSON.stringify({ final_canvas: finalCanvas }),
        });
    }

    // Course Reviews
    async getCurrentReviewWindow() {
        return this.request('/course-reviews/windows/current');
    }

    async submitCourseReview(data: { course_id: number; difficulty_rating: number; clarity_rating: number; relevance_rating: number; overall_rating: number; feedback_text?: string }) {
        return this.request('/course-reviews', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async getMyCourseReviews() {
        return this.request('/course-reviews/my-reviews');
    }

    async checkCourseReviewed(courseId: number) {
        return this.request(`/course-reviews/check/${courseId}`);
    }

    async getCourseAggregates(minReviews: number = 0) {
        return this.request(`/course-reviews/aggregates?min_reviews=${minReviews}`);
    }

    async getCourseAggregate(courseId: number) {
        return this.request(`/course-reviews/aggregates/${courseId}`);
    }

    // Knowledge Graph
    async getKnowledgeTopics(courseId?: number, subjectCode?: string) {
        const params = new URLSearchParams();
        if (courseId) params.append('course_id', courseId.toString());
        if (subjectCode) params.append('subject_code', subjectCode);
        return this.request(`/knowledge-graph/topics?${params.toString()}`);
    }

    async createKnowledgeTopic(data: { name: string; description?: string; subject_code?: string; course_id?: number; difficulty?: number; estimated_hours?: number; prerequisites?: number[] }) {
        return this.request('/knowledge-graph/topics', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async searchKnowledgeTopics(query: string) {
        return this.request(`/knowledge-graph/topics/search?q=${encodeURIComponent(query)}`);
    }

    async getKnowledgeTopic(topicId: number) {
        return this.request(`/knowledge-graph/topics/${topicId}`);
    }

    async getTopicPrerequisites(topicId: number) {
        return this.request(`/knowledge-graph/topics/${topicId}/prerequisites`);
    }

    async getMyKnowledgeGraph(courseId?: number, subjectCode?: string) {
        const params = new URLSearchParams();
        if (courseId) params.append('course_id', courseId.toString());
        if (subjectCode) params.append('subject_code', subjectCode);
        return this.request(`/knowledge-graph/my-graph?${params.toString()}`);
    }

    async updateTopicProgress(topicId: number, data: { status?: string; progress_percent?: number; confidence_score?: number; time_spent_minutes?: number }) {
        return this.request(`/knowledge-graph/my-progress/${topicId}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async getMyWeakAreas(threshold: number = 50) {
        return this.request(`/knowledge-graph/my-weak-areas?threshold=${threshold}`);
    }

    async getSuggestedTopics(limit: number = 5) {
        return this.request(`/knowledge-graph/suggested-next?limit=${limit}`);
    }

    async getLearningPaths(department?: string) {
        const params = department ? `?department=${department}` : '';
        return this.request(`/knowledge-graph/paths${params}`);
    }

    async getLearningPath(pathId: number) {
        return this.request(`/knowledge-graph/paths/${pathId}`);
    }
}


export const api = new ApiClient();

