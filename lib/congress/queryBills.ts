import {PyBridge} from 'pybridge';

const bridge = new PyBridge({python: 'python3', cwd: "../../python"});

interface API {
    process_all(congress: number): void;
}

const api = bridge.controller<API>('script.py');

export async function processAllBills(congress: number) {
    await api.process_all(congress);
}