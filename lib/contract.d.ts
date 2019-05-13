export interface LogGroup {
    Logs: {
        [k: string]: string | number;
        __time: number;
    }[];
    LogTags: Record<string, string>;
    Reserved?: string;
    Topic?: string;
    Source?: string;
}
