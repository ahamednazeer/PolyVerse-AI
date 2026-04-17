'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface WalkthroughStep {
    id: string;
    targetSelector: string;
    title: string;
    description: string;
    position: 'top' | 'bottom' | 'left' | 'right';
}

interface WalkthroughContextType {
    isActive: boolean;
    currentStep: number;
    totalSteps: number;
    currentStepData: WalkthroughStep | null;
    startWalkthrough: () => void;
    nextStep: () => void;
    prevStep: () => void;
    skipWalkthrough: () => void;
    completeWalkthrough: () => void;
    hasCompletedWalkthrough: boolean;
}

const STORAGE_KEY = 'smart-campus-walkthrough-completed';

// Walkthrough steps for student dashboard
const walkthroughSteps: WalkthroughStep[] = [
    {
        id: 'welcome',
        targetSelector: '[data-walkthrough="header"]',
        title: 'Welcome to Smart Campus! 🎓',
        description: 'This is your personal dashboard. Let\'s take a quick tour to help you get started.',
        position: 'bottom',
    },
    {
        id: 'attendance',
        targetSelector: '[data-walkthrough="attendance"]',
        title: 'Attendance Tracking',
        description: 'View your attendance summary here. You can see present days, absent days, and your overall attendance percentage.',
        position: 'top',
    },
    {
        id: 'quizzes',
        targetSelector: '[data-walkthrough="quizzes"]',
        title: 'Quiz Results',
        description: 'Track your quiz performance. See recent attempts and scores at a glance.',
        position: 'top',
    },
    {
        id: 'quick-actions',
        targetSelector: '[data-walkthrough="quick-actions"]',
        title: 'Quick Actions',
        description: 'Access all features quickly! From learning hub to attendance, quizzes, faculty locator, and more.',
        position: 'top',
    },
    {
        id: 'sidebar',
        targetSelector: '[data-walkthrough="sidebar"]',
        title: 'Navigation Menu',
        description: 'Use the sidebar to navigate between different sections. You can resize it by dragging the edge!',
        position: 'right',
    },
    {
        id: 'ai-assistant',
        targetSelector: '[data-walkthrough="ai-assistant"]',
        title: 'AI Assistant 🤖',
        description: 'Need help? Click here to chat with our AI assistant anytime. Ask questions about your courses, attendance, or campus services!',
        position: 'left',
    },
];

const WalkthroughContext = createContext<WalkthroughContextType | null>(null);

export function WalkthroughProvider({ children }: { children: React.ReactNode }) {
    const [isActive, setIsActive] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [hasCompletedWalkthrough, setHasCompletedWalkthrough] = useState(true); // Default true to prevent flash

    // Check localStorage on mount
    useEffect(() => {
        const completed = localStorage.getItem(STORAGE_KEY);
        if (completed !== 'true') {
            setHasCompletedWalkthrough(false);
            // Auto-start walkthrough for first-time users after a brief delay
            const timer = setTimeout(() => {
                setIsActive(true);
            }, 1500); // Give dashboard time to load
            return () => clearTimeout(timer);
        }
    }, []);

    const startWalkthrough = useCallback(() => {
        setCurrentStep(0);
        setIsActive(true);
    }, []);

    const nextStep = useCallback(() => {
        if (currentStep < walkthroughSteps.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            // Last step - complete walkthrough
            setIsActive(false);
            setHasCompletedWalkthrough(true);
            localStorage.setItem(STORAGE_KEY, 'true');
        }
    }, [currentStep]);

    const prevStep = useCallback(() => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    }, [currentStep]);

    const skipWalkthrough = useCallback(() => {
        setIsActive(false);
        setHasCompletedWalkthrough(true);
        localStorage.setItem(STORAGE_KEY, 'true');
    }, []);

    const completeWalkthrough = useCallback(() => {
        setIsActive(false);
        setHasCompletedWalkthrough(true);
        localStorage.setItem(STORAGE_KEY, 'true');
    }, []);

    return (
        <WalkthroughContext.Provider
            value={{
                isActive,
                currentStep,
                totalSteps: walkthroughSteps.length,
                currentStepData: isActive ? walkthroughSteps[currentStep] : null,
                startWalkthrough,
                nextStep,
                prevStep,
                skipWalkthrough,
                completeWalkthrough,
                hasCompletedWalkthrough,
            }}
        >
            {children}
        </WalkthroughContext.Provider>
    );
}

export function useWalkthrough() {
    const context = useContext(WalkthroughContext);
    if (!context) {
        throw new Error('useWalkthrough must be used within a WalkthroughProvider');
    }
    return context;
}
