import { Bodoni_Moda, Roboto } from "next/font/google";
import localFont from "next/font/local";

export const roboto = Roboto({
    subsets: ["latin"],
    weight: ["300", "400", "500", "700"],
    variable: "--font-roboto",
});

export const bodoniModa = Bodoni_Moda({
    subsets: ["latin"],
    weight: ["400", "500", "700"],
    style: ["normal", "italic"],
    variable: "--font-bodoni",
});

export const aeonik = localFont({
    src: [
        {
            path: "../../../public/fonts/AeonikPro-Light.woff2",
            weight: "300",
        },
        {
            path: "../../../public/fonts/AeonikPro-Regular.woff2",
            weight: "400",
        },
        {
            path: "../../../public/fonts/AeonikPro-Medium.woff2",
            weight: "500",
        },
        {
            path: "../../../public/fonts/AeonikPro-Bold.woff2",
            weight: "700",
        },
        {
            path: "../../../public/fonts/AeonikPro-Black.woff2",
            weight: "900",
        }
    ],
    variable: "--font-aeonik",
});

export const inter = localFont({
    src: "../../../public/fonts/AeonikPro-Regular.woff2",
    variable: "--font-inter",
});
