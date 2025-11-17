export namespace main {
	
	export class RecognitionRequest {
	    filePath: string;
	    language: string;
	    options: Record<string, any>;
	
	    static createFrom(source: any = {}) {
	        return new RecognitionRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.filePath = source["filePath"];
	        this.language = source["language"];
	        this.options = source["options"];
	    }
	}
	export class RecognitionResponse {
	    success: boolean;
	    result?: models.RecognitionResult;
	    error?: models.RecognitionError;
	
	    static createFrom(source: any = {}) {
	        return new RecognitionResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.success = source["success"];
	        this.result = this.convertValues(source["result"], models.RecognitionResult);
	        this.error = this.convertValues(source["error"], models.RecognitionError);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace models {
	
	export class RecognitionError {
	    code: string;
	    message: string;
	    details: string;
	
	    static createFrom(source: any = {}) {
	        return new RecognitionError(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.code = source["code"];
	        this.message = source["message"];
	        this.details = source["details"];
	    }
	}
	export class WordResult {
	    word: string;
	    startTime: number;
	    endTime: number;
	    confidence: number;
	
	    static createFrom(source: any = {}) {
	        return new WordResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.word = source["word"];
	        this.startTime = source["startTime"];
	        this.endTime = source["endTime"];
	        this.confidence = source["confidence"];
	    }
	}
	export class RecognitionResult {
	    language: string;
	    text: string;
	    words: WordResult[];
	    duration: number;
	    confidence: number;
	    // Go type: time
	    processedAt: any;
	    metadata: Record<string, any>;
	
	    static createFrom(source: any = {}) {
	        return new RecognitionResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.language = source["language"];
	        this.text = source["text"];
	        this.words = this.convertValues(source["words"], WordResult);
	        this.duration = source["duration"];
	        this.confidence = source["confidence"];
	        this.processedAt = this.convertValues(source["processedAt"], null);
	        this.metadata = source["metadata"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

