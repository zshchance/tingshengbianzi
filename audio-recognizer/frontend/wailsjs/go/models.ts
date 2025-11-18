export namespace main {
	
	export class RecognitionRequest {
	    filePath: string;
	    fileData?: string;
	    language: string;
	    options: Record<string, any>;
	    specificModelFile?: string;
	
	    static createFrom(source: any = {}) {
	        return new RecognitionRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.filePath = source["filePath"];
	        this.fileData = source["fileData"];
	        this.language = source["language"];
	        this.options = source["options"];
	        this.specificModelFile = source["specificModelFile"];
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
	export class Word {
	    text: string;
	    start: number;
	    end: number;
	    confidence: number;
	    speaker?: string;
	
	    static createFrom(source: any = {}) {
	        return new Word(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.text = source["text"];
	        this.start = source["start"];
	        this.end = source["end"];
	        this.confidence = source["confidence"];
	        this.speaker = source["speaker"];
	    }
	}
	export class RecognitionResultSegment {
	    start: number;
	    end: number;
	    text: string;
	    confidence: number;
	    words: Word[];
	    metadata: Record<string, any>;
	
	    static createFrom(source: any = {}) {
	        return new RecognitionResultSegment(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.start = source["start"];
	        this.end = source["end"];
	        this.text = source["text"];
	        this.confidence = source["confidence"];
	        this.words = this.convertValues(source["words"], Word);
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
	export class RecognitionResult {
	    id: string;
	    language: string;
	    text: string;
	    segments: RecognitionResultSegment[];
	    words: Word[];
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
	        this.id = source["id"];
	        this.language = source["language"];
	        this.text = source["text"];
	        this.segments = this.convertValues(source["segments"], RecognitionResultSegment);
	        this.words = this.convertValues(source["words"], Word);
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

