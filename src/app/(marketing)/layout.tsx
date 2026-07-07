import React from 'react';

interface Props {
    children: React.ReactNode
}

const MarketingLayout = ({ children }: Props) => {
    return (
        <main className="min-h-screen w-full bg-[#F5F5F5] text-black">
            {children}
        </main>
    );
};

export default MarketingLayout
