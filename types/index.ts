interface ActivityData {
    totalTime: number
    weeklyTime: number
    dailyHours: { date: string; value: number }[]
    lastUpdated: string
  }

export type SortOption = {
    value: string
    label: string
    key: keyof PoolUser
}

export type StudentSortOption = {
    value: string
    label: string
    key: keyof Student
}


export type Tutor = {
    id: string
    name: string
    photoUrl?: string
}


export interface Student { 
    id: number;
    name: string;
    level: number;
    photoUrl: string;
    location: string;
    correctionTotal: number;
    correctionPositive: number;
    correctionNegative: number;
    correctionPercentage: number;
    correctionPoints: number;
    year: number;
    wallet: number;
    activityData: ActivityData;
    blackholeTimer: number;
    campus?: string;
    relation: any;
    work: number;
}


export interface PoolUser {
    id: number;
    name: string;
    firstName: string;
    level: number;
    photoUrl: string;
    location: string;
    correctionTotal: number;
    correctionPositive: number;
    correctionNegative: number;
    correctionPercentage: number;
    correctionPoints: number;
    year: number;
    wallet: number;
    activityData: any;
    currentProjects: any;
    examGrades: any;
    isPoolUser: boolean;
}

export interface UserIntraInfo {
    id: number;
    login: string;
    email: string;
    first_name: string;
    last_name: string;
    usual_full_name: string;
    usual_first_name: string | null;
    url: string;
    phone: string;
    displayname: string;
    kind: string;
    image: {
        link: string;
        versions: {
            large: string;
            medium: string;
            small: string;
            micro: string;
        };
    };
    "staff?": boolean;
    correction_point: number;
    pool_month: string;
    pool_year: string;
    location: string | null;
    wallet: number;
    anonymize_date: string | null;
    data_erasure_date: string | null;
    created_at: string;
    updated_at: string;
    alumnized_at: string | null;
    "alumni?": boolean;
    "active?": boolean;
    groups: Array<{
        id: number;
        name: string;
    }>;
    cursus_users: Array<{
        id: number;
        begin_at: string;
        end_at: string | null;
        grade: string;
        level: number;
        skills: Array<{
            id: number;
            name: string;
            level: number;
        }>;
        cursus_id: number;
        has_coalition: boolean;
        blackholed_at: string | null;
        created_at: string;
        updated_at: string;
        user: any;
        cursus: {
            id: number;
            created_at: string;
            name: string;
            slug: string;
            kind: string;
        };
    }>;
    projects_users: Array<{
        id: number;
        occurrence: number;
        final_mark: number | null;
        status: string;
        "validated?": boolean | null;
        current_team_id: number | null;
        project: {
            id: number;
            name: string;
            slug: string;
            parent_id: number | null;
        };
        cursus_ids: number[];
        marked_at: string | null;
        marked: boolean;
        retriable_at: string | null;
        created_at: string;
        updated_at: string;
    }>;
    languages_users: Array<{
        id: number;
        language_id: number;
        user_id: number;
        position: number;
        created_at: string;
    }>;
    achievements: Array<{
        id: number;
        name: string;
        description: string;
        tier: string;
        kind: string;
        visible: boolean;
        image: string;
        nbr_of_success: number | null;
        users_url: string;
    }>;
    titles: Array<{
        id: number;
        name: string;
    }>;
    titles_users: Array<{
        id: number;
        user_id: number;
        title_id: number;
        selected: boolean;
        created_at: string;
        updated_at: string;
    }>;
    partnerships: any[];
    patroned: Array<{
        id: number;
        user_id: number;
        godfather_id: number;
        ongoing: boolean;
        created_at: string;
        updated_at: string;
    }>;
    patroning: Array<{
        id: number;
        user_id: number;
        godfather_id: number;
        ongoing: boolean;
        created_at: string;
        updated_at: string;
    }>;
    expertises_users: any[];
    roles: any[];
    campus: Array<{
        id: number;
        name: string;
        time_zone: string;
        language: {
            id: number;
            name: string;
            identifier: string;
            created_at: string;
            updated_at: string;
        };
        users_count: number;
        vogsphere_id: number;
        country: string;
        address: string;
        zip: string;
        city: string;
        website: string;
        facebook: string;
        twitter: string;
        active: boolean;
        public: boolean;
        email_extension: string;
        default_hidden_phone: boolean;
    }>;
    campus_users: Array<{
        id: number;
        user_id: number;
        campus_id: number;
        is_primary: boolean;
        created_at: string;
        updated_at: string;
    }>;
}