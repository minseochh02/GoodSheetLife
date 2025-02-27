const htmlStyle = `
<style>
    body {
        font-family: Arial, sans-serif;
        margin: 20px;
        color: #333;
    }
    .container {
        max-width: 600px;
        margin: 0 auto;
    }
    .form-group {
        margin-bottom: 15px;
    }
    label {
        display: block;
        margin-bottom: 5px;
        font-weight: bold;
    }
    textarea {
        width: 100%;
        min-height: 100px;
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        resize: vertical;
    }
    .friend-select {
        width: 100%;
        height: 200px;
        border: 1px solid #ddd;
        border-radius: 4px;
        overflow-y: auto;
    }
    .friend-option {
        padding: 8px;
        cursor: pointer;
        transition: background-color 0.2s;
    }
    .friend-option:hover {
        background-color: #f0f0f0;
    }
    .friend-option.selected {
        background-color: #e3f2fd;
    }
    .summary {
        background-color: #f8f9fa;
        padding: 20px;
        border-radius: 8px;
        margin-bottom: 20px;
    }
    .message-preview {
        background-color: white;
        padding: 15px;
        border: 1px solid #ddd;
        border-radius: 4px;
        margin: 10px 0;
    }
    .recipients {
        margin-top: 15px;
    }
    .recipient-list {
        list-style: none;
        padding: 0;
        margin: 0;
    }
    .recipient-list li {
        padding: 5px 0;
    }
    .buttons {
        text-align: right;
        margin-top: 20px;
    }
    .btn {
        padding: 8px 16px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        margin-left: 10px;
        font-size: 14px;
    }
    .btn-primary {
        background-color: #1a73e8;
        color: white;
    }
    .btn-secondary {
        background-color: #5f6368;
        color: white;
    }
    .success { color: green; }
    .failed { color: red; }
    table.results {
        width: 100%;
        border-collapse: collapse;
        margin-top: 20px;
    }
    table.results th,
    table.results td {
        padding: 8px;
        border: 1px solid #ddd;
        text-align: left;
    }
    table.results th {
        background-color: #f8f9fa;
    }
</style>
`;
