package data;

import java.net.URI;
import java.net.URISyntaxException;
import java.sql.Connection;
import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.text.DateFormat;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.ResourceBundle;
import java.util.TimeZone;
import java.util.logging.Logger;

import org.apache.olingo.commons.api.data.Entity;
import org.apache.olingo.commons.api.data.EntityCollection;
import org.apache.olingo.commons.api.data.Property;
import org.apache.olingo.commons.api.data.ValueType;
import org.apache.olingo.commons.api.edm.EdmEntitySet;
import org.apache.olingo.commons.api.edm.EdmEntityType;
import org.apache.olingo.commons.api.edm.EdmPrimitiveTypeKind;
import org.apache.olingo.commons.api.ex.ODataRuntimeException;
import org.apache.olingo.commons.api.http.HttpStatusCode;
import org.apache.olingo.server.api.ODataApplicationException;
import org.apache.olingo.server.api.uri.UriParameter;
import org.smap.sdal.constants.SmapQuestionTypes;
import org.smap.sdal.managers.EmailManager;
import org.smap.sdal.managers.TableDataManager;
import org.smap.sdal.model.KeyFilter;
import org.smap.sdal.model.TableColumn;

import smapModels.SurveyForm;
import smapModels.PortalModel;
import util.Util;

public class PortalStorage {

	private static Logger log =
			Logger.getLogger(EmailManager.class.getName());
	
	public PortalModel surveyModel;
	public ResourceBundle localisation;
	public Connection sd;
	public Connection cResults;
	public Locale locale;

	public PortalStorage(Connection sd, Connection cResults, Locale locale, ResourceBundle localisation, PortalModel surveyModel) {
		this.sd = sd;
		this.cResults = cResults;
		this.surveyModel = surveyModel;
		this.locale = locale;
		this.localisation = localisation;
	}

	/* PUBLIC FACADE */

	public EntityCollection readEntitySetData(EdmEntitySet edmEntitySet) throws SQLException, Exception {

		EntityCollection retEntitySet = new EntityCollection();
		
		String esName = edmEntitySet.getName();
		SurveyForm form = surveyModel.forms.get(esName);
		if (form != null) {
			PreparedStatement pstmt = null;
			try {
				// Get Prepared Statment
				TableDataManager tdm = new TableDataManager(localisation);
				pstmt = tdm.getPreparedStatement(sd, cResults, form.columns, surveyModel.urlprefix, form.survey.id,
						form.tableName, 0, // Parent key - set to zero to return all
						null, // HRK if not null will restrict to a specific HRK
						surveyModel.user, null, // Column name to sort on
						null, // Sort direction asc or desc
						false, // Set true to get managed form columns
						false, // Group only used when finding duplicate records
						false, // Kobo only, if true translate column names to kobo names
						0, // Start primary key
						0, // Number of records to return
						(form.parentform != 0), // get the parent key
						0, // Start parent key
						false, // Super user
						false, // Return records greater than or equal to primary key
						"no", // include bad
						null, // no custom filter
						null // no key filter
				);
				
				ResultSet rs = pstmt.executeQuery();
				while(rs.next()) {
					System.out.println("Record: ");
					Entity e = getEntity(rs, form);
					
					retEntitySet.getEntities().add(e);
				}
				
				
			} finally {
				try {
					if (pstmt != null) {	pstmt.close();}} catch (SQLException e) {}
			}
			
			return retEntitySet;
			
		}

		return null;
	}

	public Entity readEntityData(EdmEntitySet edmEntitySet, List<UriParameter> keyParams)
			throws SQLException, Exception {

		Entity entity = null;
		
		EdmEntityType edmEntityType = edmEntitySet.getEntityType();
		String esName = edmEntitySet.getName();
		SurveyForm form = surveyModel.forms.get(esName);
		if (form != null) {
			PreparedStatement pstmt = null;
			try {
				// Get the key Filter
				ArrayList<KeyFilter> keyFilters = Util.getKeyFilter(edmEntityType, keyParams);
				
				// Get Prepared Statement
				TableDataManager tdm = new TableDataManager(localisation);
				pstmt = tdm.getPreparedStatement(sd, cResults, form.columns, surveyModel.urlprefix, form.survey.id,
						form.tableName, 0, // Parent key - set to zero to return all
						null, // HRK if not null will restrict to a specific HRK
						surveyModel.user, null, // Column name to sort on
						null, // Sort direction asc or desc
						false, // Set true to get managed form columns
						false, // Group only used when finding duplicate records
						false, // Kobo only, if true translate column names to kobo names
						0, // Start primary key
						0, // Number of records to return
						(form.parentform != 0), // get the parent key
						0, // Start parent key
						false, // Super user
						false, // Return records greater than or equal to primary key
						"no", // include bad
						null, // no custom filter
						keyFilters // Add key filters
				);
				
				ResultSet rs = pstmt.executeQuery();
				if(rs.next()) {
					entity = getEntity(rs, form);	
				}
				
			} finally {
				try {
					if (pstmt != null) {	pstmt.close();}} catch (SQLException e) {}
			}
		}

		return entity;
	}

	/* INTERNAL */

	private URI createId(String entitySetName, Object id) {
		try {
			return new URI(entitySetName + "(" + String.valueOf(id) + ")");
		} catch (URISyntaxException e) {
			throw new ODataRuntimeException("Unable to create id for entity: " + entitySetName, e);
		}
	}
	
	private Entity getEntity(ResultSet rs, SurveyForm form) throws SQLException {
		int idx = 1;
		int prikey = 0;
		Entity e = new Entity();
		
		for (TableColumn c : form.columns) {
			String name = c.humanName;
			String type = c.type;
			
			if(name.equals("prikey")) {
				prikey = rs.getInt(idx);
				name = "ID";
				type = "int";
			}
				
			System.out.println("Get Entity. Type: " + idx + " : " + name + " : " + type);
			
			if(type.equals(SmapQuestionTypes.INT)) {
				int iValue = rs.getInt(idx++);
				System.out.println("        Add Int Property: " + name + " : " + iValue);
				e.addProperty(new Property(null, name, ValueType.PRIMITIVE, iValue));
			} else if(type.equals(SmapQuestionTypes.DATETIME)) {
				//Timestamp dateValue = rs.getTimestamp(idx++);		// TODO
				String dateValue = rs.getString(idx++);
				System.out.println("        Add Date Property: " + name + " : " + dateValue);
				e.addProperty(new Property(null, name, ValueType.PRIMITIVE, dateValue));
			
			} else if(type.equalsIgnoreCase(SmapQuestionTypes.STRING) ||
						type.equalsIgnoreCase(SmapQuestionTypes.SELECT1)) {
				String sValue = rs.getString(idx++);
				System.out.println("        Add String Property: " + name + " : " + sValue);
				e.addProperty(new Property(null, name, ValueType.PRIMITIVE, sValue));
			} else {
				log.info("Error: Unknown table column type: " + type + " processing as string");
				String sValue = rs.getString(idx++);
				e.addProperty(new Property(null, name, ValueType.PRIMITIVE, sValue));
			}
		}
		e.setId(createId(form.name, prikey));
		
		return e;
	}
}
