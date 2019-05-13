export interface LogGroup {
    Logs: Record<string, string>[];
    LogTags: Record<string, string>;
    Reserved?: string;
    Topic?: string;
    Source?: string;
}
