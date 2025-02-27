function getUIString(category, key, language) {
	return (
		UI_STRINGS[category]?.[key]?.[language] || UI_STRINGS[category]?.[key]?.en
	);
}

const UI_STRINGS = {
	menu: {
		policy_analyzer: {
			en: "Policy Analyzer",
			ko: "보장분석",
		},
		upload_resource: {
			en: "Upload Resource",
			ko: "자료 업로드",
		},
		receipt_contact_record: {
			en: "Receipt & Business Card Record",
			ko: "영수증 & 명함 기록",
		},
		upload_photo: {
			en: "Upload Photo",
			ko: "사진 업로드",
		},
		setup: {
			en: "Setup",
			ko: "설정",
		},
	},
};
