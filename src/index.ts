export type ClientConfig = {
  baseUrl: string;
  middlewares?: Middleware[];
  afterwares?: Afterware[];
};

export type Middleware = (
  info: RequestInfo,
  init: RequestInit
) => Promise<void> | void;

export type Afterware = (
  init: Readonly<RequestInit>,
  response: Response
) => Promise<void> | void;

export type RestMethod = "get" | "put" | "post" | "delete";

export type UnimplementedPathOptions = "cookie" | "header";
export type PathOptions<
  Paths,
  Path extends keyof Paths,
  Method extends RestMethod
> = Paths[Path] extends { [key in Method]: { parameters: any } }
  ? Omit<Paths[Path][Method]["parameters"], UnimplementedPathOptions>
  : { path?: never; query?: never };

export type PathRequestBody<
  Paths,
  Path extends keyof Paths,
  Method extends RestMethod
> = Paths[Path] extends { [key in Method]: { requestBody: any } }
  ? Paths[Path][Method]["requestBody"]
  : { content?: never };

export type ResponseCodes =
  | 200
  | 201
  | 202
  | 204
  | 400
  | 401
  | 403
  | 404
  | 409
  | 422
  | 500;
export type MimeTypes = "application/json" | "text/plain";
export type PathResponse<
  Paths,
  Path extends keyof Paths,
  Method extends RestMethod
> = Paths[Path] extends infer P
  ? P extends { [key in Method]?: { responses?: any } }
    ? P[Method] extends infer M
      ? M extends { responses: any }
        ? M["responses"] extends infer R
          ? R extends { [key in ResponseCodes]?: { content?: any } }
            ? ResponseCodes extends infer Code
              ? Code extends keyof R
                ? R[Code] extends { content: any }
                  ? R[Code]["content"] extends infer C
                    ? C extends { [key in MimeTypes]?: any }
                      ? MimeTypes extends infer MT
                        ? MT extends keyof C
                          ? C[MT]
                          : never
                        : never
                      : never
                    : never
                  : never
                : never
              : never
            : never
          : never
        : never
      : never
    : never
  : never;

export type PathsByMethod<Paths, Method extends RestMethod> = {
  [Path in keyof Paths]: Paths[Path] extends { [key in Method]: any }
    ? Extract<Path, string>
    : never;
}[keyof Paths];

export type CustomRequestInit = Omit<RequestInit, "method" | "body">;

export class Client<Paths> {
  private readonly fetcher = fetch;
  private readonly baseUrl;
  private readonly middlewares;
  private readonly afterwares;

  constructor(config: ClientConfig) {
    this.baseUrl = config.baseUrl;
    this.middlewares = config.middlewares || [];
    this.afterwares = config.afterwares || [];
  }

  async #request<
    Method extends RestMethod,
    Path extends keyof Paths,
    PathResponseType extends PathResponse<Paths, Path, Method>
  >(path: string, requestInit?: RequestInit) {
    const requestInfo: RequestInfo = `${this.baseUrl}${path}`;
    const _requestInit: RequestInit = requestInit ?? {};

    for (const middleware of this.middlewares) {
      await middleware(requestInfo, _requestInit);
    }

    const requestResponse = await this.fetcher(requestInfo, _requestInit);

    for (const afterware of this.afterwares) {
      await afterware(_requestInit, requestResponse);
    }

    const response = await this.#response<Method, Path, PathResponseType>(
      requestResponse
    );

    return response;
  }

  async #response<
    Method extends RestMethod,
    Path extends keyof Paths,
    PathResponseType extends PathResponse<Paths, Path, Method>
  >(response: Response) {
    const json = response.body ? await response.json() : {};
    return {
      data: json as PathResponseType,
      requestResponse: response as Omit<Response, "json">,
    };
  }

  async get<
    Path extends PathsByMethod<Paths, "get">,
    Options extends PathOptions<Paths, Path, "get">,
    RequestBody extends PathRequestBody<Paths, Path, "get">,
    PathResponseType extends PathResponse<Paths, Path, "get">
  >(
    urlPath: Path,
    options: Options & RequestBody,
    requestInit?: CustomRequestInit
  ) {
    const { content, path, query } = options;
    const { contentType } = this.#serializeRequestBody(content);
    const seralizedPath = this.#serializePathParams(urlPath, path);
    const serializedQuery = this.#serializeQueryParams(query) || "";

    const init: RequestInit = requestInit ?? {};
    init.method = "GET";
    init.headers = {
      "Content-Type": contentType,
      ...requestInit?.headers,
    };

    return this.#request<"get", Path, PathResponseType>(
      `${seralizedPath}${serializedQuery}`,
      init
    );
  }

  async post<
    Path extends PathsByMethod<Paths, "post">,
    Options extends PathOptions<Paths, Path, "post">,
    RequestBody extends PathRequestBody<Paths, Path, "post">,
    PathResponseType extends PathResponse<Paths, Path, "post">
  >(
    urlPath: Path,
    options: Options & RequestBody,
    requestInit?: CustomRequestInit
  ) {
    const { content, path, query } = options;
    const { contentType, requestBody } = this.#serializeRequestBody(content);
    const seralizedPath = this.#serializePathParams(urlPath, path);
    const serializedQuery = this.#serializeQueryParams(query);

    const init: RequestInit = requestInit ?? {};
    init.method = "POST";
    init.headers = {
      "Content-Type": contentType,
      ...requestInit?.headers,
    };
    init.body = requestBody;

    return this.#request<"post", Path, PathResponseType>(
      `${seralizedPath}${serializedQuery}`,
      init
    );
  }

  async put<
    Path extends PathsByMethod<Paths, "put">,
    Options extends PathOptions<Paths, Path, "put">,
    RequestBody extends PathRequestBody<Paths, Path, "put">,
    PathResponseType extends PathResponse<Paths, Path, "put">
  >(
    urlPath: Path,
    options: Options & RequestBody,
    requestInit?: CustomRequestInit
  ) {
    const { content, path, query } = options;
    const { contentType, requestBody } = this.#serializeRequestBody(content);
    const seralizedPath = this.#serializePathParams(urlPath, path);
    const serializedQuery = this.#serializeQueryParams(query);

    const init: RequestInit = requestInit ?? {};
    init.method = "PUT";
    init.headers = {
      "Content-Type": contentType,
      ...requestInit?.headers,
    };
    init.body = requestBody;

    return this.#request<"put", Path, PathResponseType>(
      `${seralizedPath}${serializedQuery}`,
      init
    );
  }

  async delete<
    Path extends PathsByMethod<Paths, "delete">,
    Options extends PathOptions<Paths, Path, "delete">,
    RequestBody extends PathRequestBody<Paths, Path, "delete">,
    PathResponseType extends PathResponse<Paths, Path, "delete">
  >(
    urlPath: Path,
    options: Options & RequestBody,
    requestInit?: CustomRequestInit
  ) {
    const { content, path, query } = options;
    const { contentType, requestBody } = this.#serializeRequestBody(content);
    const seralizedPath = this.#serializePathParams(urlPath, path);
    const serializedQuery = this.#serializeQueryParams(query);

    const init: RequestInit = requestInit ?? {};
    init.method = "DELETE";
    init.headers = {
      "Content-Type": contentType,
      ...requestInit?.headers,
    };
    init.body = requestBody;

    return this.#request<"delete", Path, PathResponseType>(
      `${seralizedPath}${serializedQuery}`,
      init
    );
  }

  #serializePathParams(path: string, params: Record<string, any>) {
    try {
      return Object.entries(params || {}).reduce((acc, [key, value]) => {
        return acc.replace(`{${key}}`, value);
      }, path);
    } catch (e) {
      return path;
    }
  }

  #serializeQueryParams(query: Record<string, any>) {
    try {
      return Object.entries(query || {})
        .reduce((acc, [key, value]) => {
          return `${acc}${key}=${value}&`;
        }, "?")
        ?.slice(0, -1);
    } catch (e) {
      return "";
    }
  }

  #serializeRequestBody(content: Record<string, any>) {
    try {
      const contentType = Object.keys(content || {})?.[0] || "application/json";
      const requestBody = JSON.stringify(content[contentType] || {});

      return {
        contentType,
        requestBody,
      };
    } catch (e) {
      return {
        contentType: "application/json",
        requestBody: JSON.stringify({}),
      };
    }
  }
}
