
import React, { useRef, useState, useEffect } from 'react';
import { i18n, SERVICES } from '../constants.js';
import { ArrowLeftIcon } from './Shared.js';
import * as settingsService from '../services/settingsService.js';

const Home = ({ language, onNavigateToServices }) => {
    const t = i18n[language];
    const [disabledServices, setDisabledServices] = useState(settingsService.getSettings().disabledServices);
    const [teamMembers, setTeamMembers] = useState(settingsService.getSettings().teamMembers);

    useEffect(() => {
        const handleSettingsChange = () => {
            const settings = settingsService.getSettings();
            setDisabledServices(settings.disabledServices);
            setTeamMembers(settings.teamMembers);
        };
        window.addEventListener('settingsChanged', handleSettingsChange);
        return () => window.removeEventListener('settingsChanged', handleSettingsChange);
    }, []);

    const HeroSection = () => (
        React.createElement('section', { className: 'container mx-auto px-6 py-16 md:py-24' },
            React.createElement('div', { className: 'grid md:grid-cols-2 gap-12 items-center' },
                React.createElement('div', { className: `text-center md:text-left ${language === 'ar' ? 'md:text-right' : ''}` },
                    React.createElement('h1', { className: 'text-4xl md:text-6xl font-bold text-slate-900 dark:text-white leading-tight' }, 
                        language === 'ar' ? 'عزّز فكرك مع عبقري العلوم' : 'Amplify Your Intellect with SciGenius'
                    ),
                    React.createElement('p', { className: 'mt-6 text-lg text-slate-500 dark:text-light-gray max-w-xl mx-auto md:mx-0' }, 
                        language === 'ar' ? 'منصتك الشاملة للبحث والإبداع والتصميم. حوّل أفكارك إلى نتائج مذهلة بمساعدة الذكاء الاصطناعي.' : 'Your all-in-one AI platform for research, creativity, and design. Transform your ideas into powerful results.'
                    ),
                    React.createElement('div', { className: `mt-8 flex justify-center md:justify-start gap-4 ${language === 'ar' ? 'md:justify-end' : ''}` },
                        React.createElement('button', {
                            onClick: onNavigateToServices,
                            className: 'px-8 py-3 bg-brand-red text-white font-semibold rounded-lg shadow-lg hover:bg-red-500 transition-colors'
                        }, language === 'ar' ? 'ابدأ الآن' : 'Get Started'),
                        React.createElement('button', {
                            className: 'px-8 py-3 bg-slate-100 hover:bg-slate-200 text-slate-900 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white font-semibold rounded-lg transition-colors backdrop-blur-sm'
                        }, language === 'ar' ? 'شاهد الفيديو' : 'Watch Video')
                    )
                ),
                React.createElement('div', { className: 'relative h-80 md:h-full flex items-center justify-center' },
                    // Abstract floating shapes
                    React.createElement('div', { className: 'absolute w-64 h-64 bg-secondary rounded-full opacity-20 dark:opacity-30 filter blur-2xl animate-spin', style: { animationDuration: '20s' } }),
                    React.createElement('div', { className: 'absolute top-0 right-10 w-48 h-48 bg-brand-blue rounded-full opacity-20 dark:opacity-30 filter blur-2xl animate-spin', style: { animationDuration: '25s', animationDirection: 'reverse' } }),
                    React.createElement('div', { className: 'absolute bottom-0 left-10 w-40 h-40 bg-green-500 rounded-full opacity-20 dark:opacity-30 filter blur-2xl animate-spin', style: { animationDuration: '18s' } }),
                    // Central floating element
                    React.createElement('div', { className: 'relative animate-float' },
                        React.createElement('div', { className: 'w-72 h-72 bg-white/40 dark:bg-white/5 backdrop-blur-md border border-white/20 rounded-2xl transform rotate-45' }),
                        React.createElement('div', { className: 'absolute inset-4 bg-white/60 dark:bg-dark-card/60 backdrop-blur-md border border-white/20 rounded-lg transform -rotate-45 flex items-center justify-center shadow-xl' },
                            React.createElement('div', { className: 'text-center' },
                                React.createElement('h3', { className: 'text-2xl font-bold text-slate-800 dark:text-white' }, 'SciGenius'),
                                React.createElement('p', { className: 'text-sm text-slate-500 dark:text-light-gray' }, 'AI-Powered Assistant')
                            )
                        )
                    )
                )
            )
        )
    );

    const WhatWeDoSection = () => {
        // Filter services based on status and settings
        const activeServices = SERVICES.filter(s => s.isAvailable !== false && !disabledServices.includes(s.id));
        const scrollingServices = [...activeServices, ...activeServices]; // Duplicate for loop

        if (activeServices.length === 0) return null;

        return React.createElement('section', { className: 'relative py-20 md:py-32 overflow-hidden bg-slate-50/80 dark:bg-white/5 backdrop-blur-sm border-y border-slate-200/50 dark:border-white/5' },
            // Ambient Background Elements
            React.createElement('div', { className: 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-7xl pointer-events-none' },
                React.createElement('div', { className: 'absolute top-0 right-0 w-96 h-96 bg-brand-blue/5 rounded-full blur-3xl mix-blend-multiply dark:mix-blend-screen opacity-50' }),
                React.createElement('div', { className: 'absolute bottom-0 left-0 w-96 h-96 bg-brand-red/5 rounded-full blur-3xl mix-blend-multiply dark:mix-blend-screen opacity-50' })
            ),
            
            React.createElement('div', { className: 'relative z-10' },
                // Header
                React.createElement('div', { className: 'container mx-auto px-6 mb-12 text-center' },
                    React.createElement('h2', { className: 'text-3xl md:text-5xl font-bold text-slate-900 dark:text-white leading-tight tracking-tight' }, 
                        language === 'ar' ? 'مجموعة أدواتنا الذكية' : 'Our Intelligent Toolset'
                    ),
                    React.createElement('p', { className: 'mt-4 text-lg text-slate-500 dark:text-light-gray font-light leading-relaxed max-w-2xl mx-auto' },
                        language === 'ar' ? 'استكشف مجموعة شاملة من خدمات الذكاء الاصطناعي المصممة لتمكينك.' : 'Explore a comprehensive suite of AI services designed to empower you.'
                    )
                ),
                
                // Auto-Scrolling Marquee Container
                React.createElement('div', { 
                    className: 'relative w-full overflow-hidden',
                    dir: 'ltr'
                },
                    // Gradient Masks for smooth fade in/out
                    React.createElement('div', { className: 'absolute top-0 left-0 h-full w-20 z-10 bg-gradient-to-r from-slate-50/80 dark:from-[#0b0f19] to-transparent pointer-events-none' }),
                    React.createElement('div', { className: 'absolute top-0 right-0 h-full w-20 z-10 bg-gradient-to-l from-slate-50/80 dark:from-[#0b0f19] to-transparent pointer-events-none' }),

                    React.createElement('div', { 
                        className: 'flex w-max animate-scroll-left pause-on-hover'
                    },
                        scrollingServices.map((service, index) => {
                             const title = t[service.titleKey];
                             const descKey = service.titleKey.replace('Title', 'Desc');
                             const desc = t[descKey];
                             
                             return React.createElement('div', { 
                                key: `${service.id}-${index}`,
                                onClick: () => onNavigateToServices(),
                                dir: language === 'ar' ? 'rtl' : 'ltr',
                                className: 'relative flex-shrink-0 w-[85vw] sm:w-[350px] px-4 cursor-pointer group'
                            },
                                React.createElement('div', { 
                                    className: 'h-full bg-white/80 dark:bg-dark-card/50 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-[2rem] p-8 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_20px_40px_-15px_rgba(255,255,255,0.05)] overflow-hidden'
                                },
                                    React.createElement('div', { className: 'absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-brand-red/20 to-brand-blue/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500' }),

                                    React.createElement('div', { className: 'flex justify-between items-start mb-6' },
                                        React.createElement('div', { className: 'relative w-16 h-16 rounded-2xl bg-slate-50 dark:bg-white/5 flex items-center justify-center border border-slate-100 dark:border-white/5 group-hover:scale-110 transition-transform duration-500' },
                                            React.cloneElement(service.icon(), { className: 'h-8 w-8 text-slate-700 dark:text-white group-hover:text-brand-red transition-colors duration-300' })
                                        ),
                                        service.isPremium && React.createElement('span', { className: 'px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-amber-200 to-yellow-400 text-yellow-900 shadow-sm' }, 'PRO')
                                    ),

                                    React.createElement('h3', { className: 'text-xl font-bold text-slate-900 dark:text-white mb-3 leading-snug' }, title),
                                    React.createElement('p', { className: 'text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-8 line-clamp-3' }, desc),

                                    React.createElement('div', { className: 'flex items-center text-brand-red font-bold text-sm' },
                                        React.createElement('span', { className: 'relative overflow-hidden' },
                                            React.createElement('span', { className: 'inline-block transition-transform duration-300 group-hover:-translate-y-full' }, language === 'ar' ? 'اكتشف المزيد' : 'Discover More'),
                                            React.createElement('span', { className: 'absolute top-0 left-0 inline-block transition-transform duration-300 translate-y-full group-hover:translate-y-0' }, language === 'ar' ? 'جرب الآن' : 'Try Now')
                                        ),
                                        React.createElement(ArrowLeftIcon, { className: `w-4 h-4 mx-2 transition-transform duration-300 group-hover:translate-x-1 ${language === 'ar' ? 'group-hover:-translate-x-1' : 'transform rotate-180'}` })
                                    )
                                )
                            );
                        })
                    )
                )
            )
        );
    };

    const ProjectsSection = () => {
        const projects = [
            'https://picsum.photos/seed/project1/600/400',
            'https://picsum.photos/seed/project2/600/400',
            'https://picsum.photos/seed/project3/600/400',
            'https://picsum.photos/seed/project4/600/400',
        ];
        return React.createElement('section', { className: 'py-20' },
            React.createElement('div', { className: 'container mx-auto px-6' },
                React.createElement('div', { className: 'text-center max-w-3xl mx-auto mb-12' },
                    React.createElement('h2', { className: 'text-3xl md:text-4xl font-bold text-slate-900 dark:text-white' }, 
                         language === 'ar' ? 'بعض من مشاريعنا المنجزة' : 'Our Finished Projects'
                    ),
                    React.createElement('p', { className: 'mt-4 text-slate-500 dark:text-light-gray' },
                         language === 'ar' ? 'شاهد كيف ساعدنا الآخرين على تحقيق أفكارهم. من التصاميم الداخلية إلى العروض التقديمية، قدراتنا لا حدود لها.' : 'See how we have helped others bring their ideas to life. From interior designs to presentation slides, the capabilities are endless.'
                    )
                ),
                React.createElement('div', { className: 'grid md:grid-cols-2 gap-8' },
                    projects.map((src, index) =>
                        React.createElement('div', { key: index, className: 'group relative overflow-hidden rounded-2xl shadow-lg border border-slate-200 dark:border-white/10' },
                            React.createElement('img', { src, alt: `Project ${index + 1}`, className: 'w-full h-full object-cover group-hover:scale-110 transition-transform duration-500' }),
                            React.createElement('div', { className: 'absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm' },
                                React.createElement('p', { className: 'text-white text-lg font-bold' }, `Showcase ${index + 1}`)
                            )
                        )
                    )
                )
            )
        );
    };

    const TeamSection = () => {
         if (!teamMembers || teamMembers.length === 0) return null;

         return React.createElement('section', { className: 'bg-slate-50/80 dark:bg-white/5 backdrop-blur-sm py-20 border-y border-slate-200/50 dark:border-white/5' },
            React.createElement('div', { className: 'container mx-auto px-6' },
                React.createElement('div', { className: 'text-center max-w-3xl mx-auto mb-12' },
                    React.createElement('h2', { className: 'text-3xl md:text-4xl font-bold text-slate-900 dark:text-white' }, 
                        language === 'ar' ? 'تعرف على فريقنا الإبداعي' : 'Meet Our Great Creative Teams'
                    ),
                    React.createElement('p', { className: 'mt-4 text-slate-500 dark:text-light-gray' },
                        language === 'ar' ? 'فريقنا المتخصص من الخبراء جاهز لمساعدتك في تحقيق أقصى استفادة من الذكاء الاصطناعي.' : 'Our dedicated team of experts is ready to help you leverage the full potential of AI.'
                    )
                ),
                React.createElement('div', { className: 'grid md:grid-cols-3 gap-8' },
                    teamMembers.map((member, index) => 
                        React.createElement('div', { key: index, className: 'text-center bg-white/60 dark:bg-dark-bg/60 backdrop-blur-md border border-slate-100 dark:border-white/10 p-6 rounded-2xl shadow-lg' },
                            React.createElement('img', { src: member.img, alt: member.name, className: 'w-32 h-32 rounded-full mx-auto mb-4 border-4 border-brand-red shadow-md object-cover' }),
                            React.createElement('h3', { className: 'text-xl font-bold text-slate-900 dark:text-white' }, member.name),
                            React.createElement('p', { className: 'text-slate-500 dark:text-light-gray' }, member.role)
                        )
                    )
                )
            )
        );
    };


    return React.createElement('div', { className: "w-full" },
        React.createElement(HeroSection, null),
        React.createElement(WhatWeDoSection, null),
        React.createElement(ProjectsSection, null),
        React.createElement(TeamSection, null)
    );
};

export default Home;
