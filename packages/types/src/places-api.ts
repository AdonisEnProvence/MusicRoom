/**
 * Copy-pasted from https://github.com/indrimuska/google-maps-api-typings
 */

export interface PlaceAutocompleteResponse {
    /** contains metadata on the request. */
    status: PlaceAutocompleteResponseStatus;
    /**
     * When the Places service returns a status code other than `OK`, there may be an additional `error_message` field
     * within the response object. This field contains more detailed information about the reasons behind the given status code.
     */
    error_message?: string;
    /**
     * contains an array of places, with information about the place.
     * See [Place Autocomplete Results](https://developers.google.com/places/web-service/autocomplete#place_autocomplete_results)
     * for information about these results. The Places API returns up to 5 results.
     */
    predictions: PlaceAutocompleteResult[];
}

/**
 * The `status` field within the Place Autocomplete response object contains the status of the request,
 * and may contain debugging information to help you track down why the Place Autocomplete request failed.
 */
export type PlaceAutocompleteResponseStatus =
    | /** indicates that no errors occurred and at least one result was returned. */
    'OK'
    /**
     * indicates that the search was successful but returned no results.
     * This may occur if the search was passed a bounds in a remote location.
     */
    | 'ZERO_RESULTS'
    /** indicates that you are over your quota. */
    | 'OVER_QUERY_LIMIT'
    /** indicates that your request was denied, generally because of lack of an invalid key parameter. */
    | 'REQUEST_DENIED'
    /** generally indicates that the input parameter is missing. */
    | 'INVALID_REQUEST'
    /** indicates a server-side error; trying again may be successful. */
    | 'UNKNOWN_ERROR';

/**
 * When the Places service returns JSON results from a search, it places them within a `predictions` array.
 * Even if the service returns no results (such as if the `location` is remote) it still returns an empty `predictions` array.
 * XML responses consist of zero or more `<prediction>` elements.
 *
 * **Note:** The Place Autocomplete response does not include the `scope` or `alt_ids` fields that you may see
 * in search results or place details. This is because Autocomplete returns only Google-scoped place IDs.
 * It does not return app-scoped place IDs that have not yet been accepted into the Google Places database.
 */
export interface PlaceAutocompleteResult {
    /**
     * contains the human-readable name for the returned result.
     * For `establishment` results, this is usually the business name.
     */
    description: string;
    /**
     * is a textual identifier that uniquely identifies a place.
     * To retrieve information about the place, pass this identifier in the `placeId` field of a Places API request.
     */
    place_id: string;
    /**
     * contains an array of terms identifying each section of the returned description
     * (a section of the description is generally terminated with a comma).
     */
    terms: PredictionTerm[];
    /**
     * contains an array of types that apply to this place.
     * For example: `[ "political", "locality" ]` or `[ "establishment", "geocode" ]`.
     */
    types: AddressType[];
    /**
     * contains an array with `offset` value and `length`. These describe the location of
     * the entered term in the prediction result text, so that the term can be highlighted if desired.
     */
    matched_substrings: PredictionSubstring[];
    /** contains details on the prediction. */
    structured_formatting: StructuredFormatting;
}

export type AddressType =
    | /** indicates a precise street address. */
    'street_address'
    /** indicates a named route (such as "US 101"). */
    | 'route'
    /** indicates a major intersection, usually of two major roads. */
    | 'intersection'
    /** indicates a political entity. Usually, this type indicates a polygon of some civil administration. */
    | 'political'
    /** indicates the national political entity, and is typically the highest order type returned by the Geocoder. */
    | 'country'
    /**
     * indicates a first-order civil entity below the country level. Within the United States, these administrative levels are states.
     * Not all nations exhibit these administrative levels. In most cases, `administrative_area_level_1` short names will closely match
     * ISO 3166-2 subdivisions and other widely circulated lists; however this is not guaranteed as our geocoding results are based
     * on a variety of signals and location data.
     */
    | 'administrative_area_level_1'
    /**
     * indicates a second-order civil entity below the country level. Within the United States, these administrative levels are counties.
     * Not all nations exhibit these administrative levels.
     */
    | 'administrative_area_level_2'
    /**
     * indicates a third-order civil entity below the country level. This type indicates a minor civil division.
     * Not all nations exhibit these administrative levels.
     */
    | 'administrative_area_level_3'
    /**
     * indicates a fourth-order civil entity below the country level. This type indicates a minor civil division.
     * Not all nations exhibit these administrative levels.
     */
    | 'administrative_area_level_4'
    /**
     * indicates a fifth-order civil entity below the country level. This type indicates a minor civil division.
     * Not all nations exhibit these administrative levels.
     */
    | 'administrative_area_level_5'
    /** indicates a commonly-used alternative name for the entity. */
    | 'colloquial_area'
    /** indicates an incorporated city or town political entity. */
    | 'locality'
    /**
     * indicates a specific type of Japanese locality, to facilitate distinction between multiple locality components within a
     * Japanese address.
     */
    | 'ward'
    /**
     * indicates a first-order civil entity below a locality. For some locations may receive one of the additional types:
     * `sublocality_level_1` to `sublocality_level_5`. Each sublocality level is a civil entity. Larger numbers indicate a smaller
     * geographic area.
     */
    | 'sublocality'
    /** indicates a named neighborhood */
    | 'neighborhood'
    /** indicates a named location, usually a building or collection of buildings with a common name */
    | 'premise'
    /**
     * indicates a first-order entity below a named location, usually a singular building within a collection of buildings with a
     * common name.
     */
    | 'subpremise'
    /** indicates a postal code as used to address postal mail within the country. */
    | 'postal_code'
    /** indicates a prominent natural feature. */
    | 'natural_feature'
    /** indicates an airport. */
    | 'airport'
    /** indicates a named park. */
    | 'park'
    /**
     * indicates a named point of interest. Typically, these "POI"s are prominent local entities that don't easily fit in another category,
     * such as "Empire State Building" or "Statue of Liberty".
     */
    | 'point_of_interest';

export interface PredictionTerm {
    /** containing the text of the term. */
    value: string;
    /** start position of this term in the description, measured in Unicode characters. */
    offset: number;
}

export interface PredictionSubstring {
    /** location of the entered term. */
    offset: number;
    /** length of the entered term. */
    length: number;
}

export interface StructuredFormatting {
    /** contains the main text of a prediction, usually the name of the place. */
    main_text: string;
    /**
     * contains an array with `offset` value and `length`. These describe the location of
     * the entered term in the prediction result text, so that the term can be highlighted if desired.
     */
    main_text_matched_substrings: PredictionSubstring[];
    /** contains the secondary text of a prediction, usually the location of the place. */
    secondary_text: string;
}
