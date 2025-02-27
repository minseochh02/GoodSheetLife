const CONFIG = {
	STORAGE_KEY: "APP_CONFIG",
	SUPPORTED_LANGUAGES: {
		EN: "en",
		KO: "ko",
	},
	DEFAULT_LANGUAGE: "en",
	DEFAULTS: {
		language: "en",
		country: "United States",
		timezone: "America/New_York",
		email: "",
		app_script_id: "",
		goodsheet_sheet_id: "",
		parent_folder_id: "",
		community_folder_id: "",
		templates_folder_id: "",
		upload_folder_id: "",
	},
	SETUP_STATUS: {
		authorized: true, // if the script can access this, it means the user has authorized the script
		setupComplete: false,
	},
};

const AppConfig = {
	get() {
		const scriptProperties = PropertiesService.getScriptProperties();
		const configProperty = scriptProperties.getProperty(CONFIG.STORAGE_KEY);
		if (!configProperty) {
			return CONFIG.DEFAULTS;
		}
		return JSON.parse(configProperty);
	},
	set(newConfig) {
		const scriptProperties = PropertiesService.getScriptProperties();
		const currentConfig = this.get();
		const updatedConfig = { ...currentConfig, ...newConfig };
		scriptProperties.setProperty(
			CONFIG.STORAGE_KEY,
			JSON.stringify(updatedConfig)
		);
		return updatedConfig;
	},
	reset() {
		const scriptProperties = PropertiesService.getScriptProperties();
		scriptProperties.deleteProperty(CONFIG.STORAGE_KEY);
	},
};
