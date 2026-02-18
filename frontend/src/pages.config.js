/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Accounting from './pages/Accounting';
import AdminOrganizations from './pages/AdminOrganizations';
import AppSettings from './pages/AppSettings';
import CampaignDetails from './pages/CampaignDetails';
import Campaigns from './pages/Campaigns';
import Communications from './pages/Communications';
import Contacts from './pages/Contacts';
import Dashboard from './pages/Dashboard';
import Documents from './pages/Documents';
import FractionMeetingTemplates from './pages/FractionMeetingTemplates';
import Imprint from './pages/Imprint';
import Invoices from './pages/Invoices';
import MandateLevy from './pages/MandateLevy';
import Meetings from './pages/Meetings';
import Motions from './pages/Motions';
import OrganizationDetails from './pages/OrganizationDetails';
import Organizations from './pages/Organizations';
import PrintTemplates from './pages/PrintTemplates';
import Privacy from './pages/Privacy';
import Profile from './pages/Profile';
import Reporting from './pages/Reporting';
import Support from './pages/Support';
import Tasks from './pages/Tasks';
import TemplateEditor from './pages/TemplateEditor';
import UserManagement from './pages/UserManagement';
import WorkflowAutomation from './pages/WorkflowAutomation';
import BulkEmail from './pages/BulkEmail';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Accounting": Accounting,
    "AdminOrganizations": AdminOrganizations,
    "AppSettings": AppSettings,
    "CampaignDetails": CampaignDetails,
    "Campaigns": Campaigns,
    "Communications": Communications,
    "Contacts": Contacts,
    "Dashboard": Dashboard,
    "Documents": Documents,
    "FractionMeetingTemplates": FractionMeetingTemplates,
    "Imprint": Imprint,
    "Invoices": Invoices,
    "MandateLevy": MandateLevy,
    "Meetings": Meetings,
    "Motions": Motions,
    "OrganizationDetails": OrganizationDetails,
    "Organizations": Organizations,
    "PrintTemplates": PrintTemplates,
    "Privacy": Privacy,
    "Profile": Profile,
    "Reporting": Reporting,
    "Support": Support,
    "Tasks": Tasks,
    "TemplateEditor": TemplateEditor,
    "UserManagement": UserManagement,
    "WorkflowAutomation": WorkflowAutomation,
    "BulkEmail": BulkEmail,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};